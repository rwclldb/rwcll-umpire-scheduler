# Paying umpires with Stripe: what to register now

This is the checklist for the **Stripe side** of Phase 12. You can do all of it without any code, and **none of it
moves real money**: we build and test in Stripe's **test mode** first. The earlier steps cost nothing.

## The one rule that shapes everything: a parent or guardian owns the account

Most of our umpires are youth (13 to 17). Stripe's own support pages say:

- **Express and Custom Connect accounts require the account holder to be 18 or older.**
- **Standard accounts** allow 13 and up, but **if the person is under 18, a parent or legal guardian must be the
  account owner** before the account can take funds or send money to a bank.

So a youth umpire cannot hold their own Stripe payout account. The normal, accepted way (other youth-sports referee platforms do
exactly this) is that **the parent or guardian is the Stripe account holder and the money goes to their bank account**.

**What I plan to build:** one Stripe account per **payee** (an adult). An adult umpire is their own payee. For a youth umpire the
payee is a parent or guardian, who has an account in this app and presses a **Set up payments** button, which opens Stripe's own
page where they give their details and bank account. One parent with two umpiring children is **one** Stripe account. The league
tracks what each child earned and pays the parent's account the total.

*(Your league management should confirm it is comfortable paying a child's earnings into a parent's account. That is one sentence
for them to agree to; nothing needs to be built for it.)*

## What to register, in order

### 1. The league's Stripe account (15 minutes; free)

1. Go to stripe.com and create an account for **Redwood City Little League** (not a personal one). Use an email that will outlive
   any one volunteer, such as an officers' address.
2. Stripe will ask for the organization's details: legal name, address, **EIN**, what the organization does, and **a person who is
   an officer** (name, birth date, last 4 of their SSN). That person must be an adult with authority for the league.
3. Add the league's **checking account** (this is where money for payroll comes from).
4. Turn on **two-step verification** for every person who has access. Stripe requires it to add funds.

You can use **test mode** immediately: it needs no approval and uses pretend money.

### 2. Switch on Connect and complete the platform profile (20 minutes, then Stripe may take days to review)

1. In the Stripe Dashboard, open **Connect** and choose **Get started**.
2. Say you are a **platform that pays out to people** (service providers), not a shop taking card payments.
3. Complete the **platform profile** (a short questionnaire about how you pay people) and add the league's name, logo and colors
   in **Branding**. Be plain and honest: *"A youth sports league paying youth umpires monthly, through a parent or guardian."*
4. For the account type, choose **Express**, with only the **transfers** capability (we never take card payments from the umpires).

Stripe can take several days to review a platform. **Start this early**, because it is the only step you cannot speed up.

### 3. Verify the bank account so you can add funds (10 minutes, then 1 to 2 business days)

Stripe can only pay out money that is **already in the league's Stripe balance**. You add money to that balance from the
league's bank (a "top-up"). First Stripe verifies the bank account with two small deposits (microdeposits); you then type the two
amounts into the Dashboard.

**Timing matters:** a top-up by **ACH debit takes about 5 to 6 business days** to become available; a **wire or ACH credit is
faster** (roughly 1 to 3 days). So the treasurer must top up **about a week before** each payday. (Stripe does not retry a
transfer if the balance is too low, so the system will check the balance first and tell the treasurer if it is short.)

### 4. Decide who pays Stripe's fees (a setting in Connect)

With **Express**, the usual arrangement (and the one I assume) is that **the league pays**:

| Fee | Amount (US) |
|---|---|
| Per paid account, per month | **$2.00** (only in a month the account is actually paid) |
| Per payout | **0.25% of the payout + $0.25** |

**An example:** a family paid **$150** in a month costs the league about **$2.00 + $0.25 + $0.38 = $2.63** (about 1.8%). Thirty
families paid monthly is roughly **$80 a month**. Please check the current numbers at **stripe.com/connect/pricing** because Stripe changes
them. A bigger monthly payout per family makes the fee a smaller share. (Paying by check or bank transfer from the ledger costs
nothing in fees, only volunteer time, and is always possible.)

### 5. Later, not now

- **API keys** and a **webhook secret**: I will ask for these when we connect the app, and they go into Supabase's secrets
  (never into chat or a file).
- **Tax paperwork (1099s, W-9s)** and **work-permit rules**: you said your league management handles these. Nothing is needed
  in the system for now.

**Umpires who turn 18** are changed to adult umpires automatically, and told they must set up their own payment account (their own Stripe account, not a parent's). That is why Stripe needs both flows: a parent's account for each youth family, and an adult's own account.

**Before parents can be paid:** each parent signs up as a **parent or guardian** in the app, an administrator approves them and links them to their children (the **Families** tab), and the treasurer chooses them as the payee (**Payments, Who is paid**).

## What umpires and parents will see (so you can explain it)

1. A parent signs in to the app, sees **Set up payments** for their umpire, and presses it.
2. Stripe's own page opens: it asks for the parent's name, address, birth date, last 4 of SSN, and bank account. The app never
   sees or stores any of that.
3. They return to the app, which shows **Payments are set up**.
4. Each month the treasurer reviews what everyone earned, **approves the batch**, and the money is sent to each parent's bank
   account (it usually arrives in 1 to 2 business days).

## What I need from you before the next step

Answers to the three questions in chat (who gets the money for a youth umpire; what makes a game payable; who approves a
batch), and, when your Stripe account exists, whether **test mode** is on. I will tell you when to add the test keys.
