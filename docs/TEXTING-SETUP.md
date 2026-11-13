# Texting: what to decide, what to prepare, and how to set it up

**Texting can be switched on and off at any time (`sms_mode`), and email never depends on it.** Urgent messages work by email without texting at all (FAQ section 62). Texting is the extra layer.

Texting is **built but off** (see `EMAIL-SENDING.md`, Part 6). This page is the plan for switching it on, mainly for **urgent messages**
(a game canceled, a field closed, an umpire dropping out, within two hours of a game) and the day-before reminder.

**Start the paperwork first.** The code is quick; the carrier registration is the long wait (plan on **two to three weeks**), so begin it now,
while the urgent-message code is built in parallel.

## What it costs, and how long it takes

Figures from Twilio's own pages and recent guides, checked **October 2026**. Check Twilio's current pages before you pay.

| | Cost |
|---|---|
| Brand registration (the league), low-volume | $4.50, once |
| Campaign review (what you send) | $15, once |
| Low-volume "mixed" campaign | $1.50 a month |
| A phone number | about $1.15 a month |
| Each text | about 1 cent all-in (Twilio's rate plus carrier fees) |

For about 40 people and a few hundred texts a month: **roughly $22 the first month, then about $3 to $5 a month.**

| | Time |
|---|---|
| Brand registration | usually 1 to 2 days |
| Campaign review | Twilio says up to 5 business days; others report 10 to 15 days. **Plan on 2 to 3 weeks**, and it can be rejected and re-submitted |

**Texts from an unregistered number are blocked outright by the carriers**, so there is no shortcut.

**Alternative: a toll-free number.** It has its own verification (about 3 to 5 business days), no 10DLC fees, and a monthly number fee of about $2. It is a
reasonable fallback if the 10DLC review drags on. The sender works with either.

## Decide these first (the board), because they change what you register

1. **Which messages?** Suggested: the **day-before reminder**, and **urgent changes within 2 hours of a game** (umpire dropped out, field closed, game canceled, umpire change). Nothing else. The registration must describe what you really send, so decide now.
2. **Who gets them?** Suggested: umpires who **agreed themselves**, and the administrators (scheduler, umpire chief) who must react to a decline.
3. **Youth umpires. DECIDED: youth and their parents both get the texts.** A youth umpire is texted at their own number if their own account agreed, and a parent is texted (about their child's games) if the parent agreed on their own account; each person agrees for themselves in My details. (The original question, for the record:) Texts currently go only to the umpire's own number, never a parent's. Decide whether youth umpires may be texted at their own number (with the parent's agreement already on file for under-13s), whether a **parent** should get it instead or as well (a parent would need to agree on their own account), or whether youth get **email only**. Check the league's child-protection rules for electronic messages to minors.
4. **Who is the sender in the paperwork?** The league's legal name, exactly as on its IRS letter, with its EIN.

## What to have ready

- The league's **legal name, EIN, address, website** and a contact person with a phone and email that can receive a verification message.
- A public page on the league's website with a **privacy policy** and **SMS terms** (draft wording below). Reviewers check that the website matches the registration, and a missing policy is the most common reason for rejection.
- The description of **how people agree to texts** (below). It must match what people actually see in the app.
- Two or three **sample messages** (below). The real texts must match them.

## Draft wording (adapt it, and check Twilio's current form)

**What the campaign is for**

> Redwood City Little League sends schedule notifications to its volunteer umpires and the administrators who schedule them. A reminder the day before an assigned game, and urgent changes within two hours of a game (an umpire dropping out, a field closed for weather, a game canceled). Messages go only to people who ticked a box in their own account on the league's scheduling website and entered their own mobile number. About 40 recipients and fewer than 300 messages a month.

**How people agree (opt-in)**

> Each person signs in to the league's scheduling website, opens "My details", enters their mobile number and ticks the box "Text me about my games". The box shows the types of message, that message frequency varies, that message and data rates may apply, that they can reply STOP to cancel and HELP for help, and links to the Privacy Policy and SMS Terms. Administrators cannot switch it on for someone else, and a person can switch it off at any time.

**Sample messages**

1. `RWCLL Umpires: Reminder: you umpire plate tomorrow, Sat Nov 14, 9:00 AM at Bechet Field. Reply STOP to opt out, HELP for help.`
2. `RWCLL Umpires: Game canceled (rain): Sat Nov 14, 11:00 AM at Kennedy Middle School. Reply STOP to opt out.`
3. `RWCLL Umpires: Umpire declined: Michael C. (plate), Sat Nov 14, 9:00 AM at Bechet Field. The place is open. Reply STOP to opt out.`

**For the website: privacy policy paragraph**

> Phone numbers collected through the league's umpire scheduling website are used only to send the scheduling messages the person asked for. We do not sell, rent or share phone numbers or text-message consent with third parties, and we do not use them for marketing.

**For the website: SMS terms**

> Program: RWCLL Umpires schedule alerts. You will get a reminder before games you are assigned to, and urgent changes (cancellations, closures, umpire changes). Message frequency varies with your games. Message and data rates may apply. Reply STOP to cancel at any time, or HELP for help. Questions: (the league's contact email). Participation is optional and is not a condition of umpiring.

## When it is approved

1. In Twilio, note the **Account SID**, **Auth Token** and your **number** (or messaging service).
2. Set the sender's keys (`EMAIL-SENDING.md`, Part 6): `supabase secrets set TWILIO_ACCOUNT_SID=...` and the others.
3. Switch texting on **in safe mode** with your own number only (`sms_mode = safe`, your number in `sms_safe_allowlist`) and check a test.
4. Only then set `sms_mode = live`.

**The checkbox in the app must change too.** It now says what people are agreeing to (the message types, frequency, rates, STOP and HELP, and that nothing is sent until the league turns texting on). **Before you register, add the links to your Privacy Policy and SMS Terms next to it**, which is also what the reviewers will read.

## Things that get a registration rejected

- The name or EIN does not match the IRS record or the website.
- No privacy policy or SMS terms on the website, or no mention of texting in them.
- The consent described is not what people actually see.
- Sample messages that do not look like the real ones, or that mention anything promotional.
