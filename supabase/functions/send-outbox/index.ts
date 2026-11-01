// The sender: sends the messages waiting in the Outbox.
//
// It runs every few minutes (see supabase/jobs/schedule_email_jobs.sql), claims
// waiting messages through the database, decides what to do with each one (see
// logic.ts: nothing is sent while the mode is "off", and in "safe" mode only to the
// safe list), sends it, and reports back what happened.
//
// It is called with a secret in the x-sender-secret header (deploy it with
// --no-verify-jwt). The mailbox password, the secret and the text-message keys are
// kept as function secrets in Supabase, never in the project.
//
// @ts-nocheck  (this file runs in Supabase's Deno, not in the app's build)
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.14";
import {
  classifySmtpError,
  classifyTwilioError,
  dailyBudget,
  decideEmail,
  decideSms,
  fromHeader,
  parseMode,
  positiveNumber,
  safeEqual,
} from "./logic.ts";

const BATCH = 20;

Deno.serve(async (request) => {
  const secret = Deno.env.get("SENDER_SECRET") ?? "";
  const given = request.headers.get("x-sender-secret") ?? "";
  if (!secret || !safeEqual(secret, given)) return new Response("Forbidden", { status: 403 });

  const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  const loaded = await supabase.from("sending_settings").select("key, value");
  if (loaded.error) return Response.json({ error: `Could not read the settings: ${loaded.error.message}` }, { status: 500 });
  const settings = Object.fromEntries((loaded.data ?? []).map((row) => [row.key, row.value]));

  const summary = { email: await sendEmails(supabase, settings), sms: await sendTexts(supabase, settings) };
  return Response.json(summary);
});

async function sendEmails(supabase, settings) {
  if (parseMode(settings.email_mode) === "off") return { mode: "off" };

  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");
  if (!user || !pass) return { mode: settings.email_mode, error: "SMTP_USER and SMTP_PASS are not set." };

  const transport = nodemailer.createTransport({
    host: Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com",
    port: Number(Deno.env.get("SMTP_PORT") ?? 465),
    secure: true,
    auth: { user, pass },
  });

  // check the mailbox works BEFORE taking any messages, so a broken password never uses up their tries
  try {
    await transport.verify();
  } catch (error) {
    return { mode: settings.email_mode, error: `The mailbox could not be reached: ${String(error?.message ?? error).slice(0, 200)}` };
  }

  const sentToday = await supabase.rpc("outbox_sent_last_day");
  const budget = dailyBudget(positiveNumber(settings.email_daily_limit, 400), Number(sentToday.data ?? 0), BATCH);
  if (budget === 0) return { mode: settings.email_mode, note: "The daily limit has been reached." };

  const claimed = await supabase.rpc("claim_outbox_batch", { p_limit: budget });
  if (claimed.error) return { mode: settings.email_mode, error: claimed.error.message };

  const from = fromHeader(settings.email_from_name ?? "RWCLL Umpires", user);
  const result = { mode: settings.email_mode, sent: 0, skipped: 0, retry: 0, failed: 0 };
  const rows = claimed.data ?? [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const decision = decideEmail(row, settings, new Date());

    if (decision.action === "skip") {
      await supabase.rpc("finish_outbox_message", { p_id: row.id, p_result: "skipped", p_error: decision.reason });
      result.skipped++;
      continue;
    }

    try {
      await transport.sendMail({
        from,
        to: decision.message.to,
        replyTo: decision.message.replyTo ?? undefined,
        subject: decision.message.subject,
        text: decision.message.text,
        headers: { "X-RWCLL-Message": row.id },
      });
      await supabase.rpc("finish_outbox_message", { p_id: row.id, p_result: "sent" });
      result.sent++;
    } catch (error) {
      const outcome = classifySmtpError(error);
      await supabase.rpc("finish_outbox_message", { p_id: row.id, p_result: outcome.result, p_error: outcome.error });
      result[outcome.result]++;

      // the mailbox itself is the problem: stop, and give the rest back untouched
      if (outcome.stop) {
        const rest = rows.slice(i + 1).map((item) => item.id);
        if (rest.length) await supabase.rpc("release_outbox_claims", { p_ids: rest });
        result.stopped = outcome.error;
        break;
      }
    }
  }

  return result;
}

async function sendTexts(supabase, settings) {
  if (parseMode(settings.sms_mode) === "off") return { mode: "off" };

  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_FROM");
  const service = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
  if (!sid || !token || (!fromNumber && !service)) return { mode: settings.sms_mode, error: "The text message keys are not set." };

  const claimed = await supabase.rpc("claim_sms_batch", { p_limit: BATCH });
  if (claimed.error) return { mode: settings.sms_mode, error: claimed.error.message };

  const result = { mode: settings.sms_mode, sent: 0, skipped: 0, retry: 0, failed: 0 };
  const rows = claimed.data ?? [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const decision = decideSms(row, settings, new Date());

    if (decision.action === "skip") {
      await supabase.rpc("finish_sms_message", { p_id: row.id, p_result: "skipped", p_error: decision.reason });
      result.skipped++;
      continue;
    }

    const form = new URLSearchParams({ To: decision.message.to, Body: decision.message.text });
    if (service) form.set("MessagingServiceSid", service);
    else form.set("From", fromNumber);

    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: "Basic " + btoa(`${sid}:${token}`), "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });

      if (response.ok) {
        await supabase.rpc("finish_sms_message", { p_id: row.id, p_result: "sent" });
        result.sent++;
        continue;
      }

      const body = await response.json().catch(() => ({}));
      const outcome = classifyTwilioError(response.status, body.code, body.message ?? response.statusText);
      await supabase.rpc("finish_sms_message", { p_id: row.id, p_result: outcome.result, p_error: outcome.error });
      result[outcome.result]++;

      if (outcome.stop) {
        const rest = rows.slice(i + 1).map((item) => item.id);
        if (rest.length) await supabase.rpc("release_sms_claims", { p_ids: rest });
        result.stopped = outcome.error;
        break;
      }
    } catch (error) {
      await supabase.rpc("finish_sms_message", { p_id: row.id, p_result: "retry", p_error: String(error?.message ?? error).slice(0, 300) });
      result.retry++;
    }
  }

  return result;
}
