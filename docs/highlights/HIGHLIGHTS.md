# Highlights

The parts of Hierarchy Hub most worth seeing, in one page. Everything here is live at **[d6atm0gw3zjf0.cloudfront.net](https://d6atm0gw3zjf0.cloudfront.net)**, and covered by tests. For the full list of extras, see [Beyond the brief](../extras/EXTRAS.md).

## Wow factors

- **Time travel.** Drag a slider, or press **Play history**, and watch the organisation rebuild itself day by day: people join, leave with their teams, change roles and move managers. It works by undoing the audit trail newest first, and a test proves it rebuilds the past exactly. _Explore page, top bar._
- **A small machine learning model for pay.** A linear regression, fitted with least squares in the browser, learns what each position in the organisation usually earns. It flags salaries more than 25% out of line, and suggests a range when adding someone. It only learns from salaries you're allowed to see. _Open Ruan or Johan, or the Salary field when adding someone._
- **A 3D Orbit org chart.** The selected person sits in the middle with their team circling them on a tilted ring you can spin, with moons showing each person's own team size. Drag someone onto a new manager to move them. _Explore page._

## Frontend

- **Sentence filters.** The People page reads like a sentence ("Show people in any role, earning any salary...") where every phrase is a filter, and the address bar keeps it, so any view can be shared.
- **Search from anywhere.** Press `/` on any page to find someone by name, email or employee number.
- **Clash handling.** If two people edit the same employee at once, the second is told who saved first and can load the latest version. Nothing is overwritten silently.
- **Built to be usable by everyone.** Every main page passes automated accessibility checks, works by keyboard, respects reduced motion, and has light and dark themes.

## Backend and security

- **Permissions that follow the org chart.** You can only change people below you, and about yourself only your name and email. A junior can never make their boss report to them. Checked again inside a database lock, so it can't be raced.
- **Private salaries, even through filters.** Only the person and those above them see salaries and birth dates. Filtering or sorting by salary only looks at people you can see, so the filters can't be used to guess anyone else's.
- **Rate limits per IP address.** 300 reads and 60 changes per minute for each visitor, counted by their real IP even behind CloudFront and the load balancer.
- **Hardened sign in.** Argon2id passwords, a 15 minute lock after 5 wrong tries, the same answer for an unknown email and a wrong password (in the same time), and only a hash of each session stored.
- **An audit trail nobody can edit.** Every change is written in the same transaction as the change itself, with each field before and after. The API's database user can't edit or delete it, and a trigger stops even the table's owner.
- **Every attack kept as a test.** 30+ attacks were tried against the API, 11 real problems were found and fixed, and each one is now an automated test. _[Security testing](../security/ATTACKS.md)._

## Database

- **Rules enforced where they can't be skipped.** Nobody is their own manager, reporting loops are impossible, and everyone is at least 15. The database itself refuses these, not just the forms.
- **Least privilege.** The API connects as a user that can read and write rows but can't change, drop or create tables. Migrations use a separate user.

## Cloud

- **One address for everything.** The web app and the API share one HTTPS address, so the sign-in cookie stays first-party.
- **Locked down by design.** The database has no route to the internet, the API is only reachable through CloudFront with a secret header, and each part only gets the passwords it needs.
- **Infrastructure as tested code.** The whole AWS setup is TypeScript (CDK), with tests that check there's no NAT gateway, the database is private and encrypted, and secrets go only where they're needed.
- **Runs on the Free plan.** Sized to stay inside the free credits, on an account that can never be billed.

## Quality

- **535 automated tests** across the web app, the API, the database, the shared rules and the infrastructure, run by CI on every pull request.
- **21 decision records** explaining every important choice, the options considered, and why. _[Decisions](../adr/README.md)._

## Five minute tour

1. Sign in as Thandi (CEO). On **Explore**, press **Play history**.
2. Open **Ruan**: see the pay check. Drag someone in the Orbit onto a new manager.
3. On **People**, filter with the sentence, sort by salary, export to CSV.
4. Open **Audit** and see every change, before and after.
5. Sign out, sign in as Ruan, and see that he can only edit his own name and email, and that everyone else's salary says **Private**.
