# 0019. A pay check that learns from the organisation

- Status: Accepted
- Date: 2026-10-08

## Context

HR teams want to spot salaries that look out of line, and to know what to offer someone new. With salaries now private to the person and those above them (ADR 0017), any insight has to respect the same rule: it must never reveal or hint at a salary you can't already see.

In the sample organisation almost every role has one person in it, so comparing people within the same role would flag nobody.

## Options

| Option                                                     | Pros                                                                                                | Cons                                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Compare each person to others with the same role           | Easy to explain.                                                                                    | Useless when roles are unique, as here.                                                  |
| Ask an outside AI service                                  | Flexible questions.                                                                                 | Sends salaries to a third party, costs money per question, and breaks the privacy rules. |
| A small regression on where people sit in the organisation | Works for any role. Runs in the browser on data you can already see. Every number can be explained. | Only knows what its features tell it: nothing about seniority, skills or the job market. |

## Decision

A **linear regression** predicts salary from two facts about someone's position:

- how many people are below them, as `log2(1 + team size)`, so the step from 0 to 3 people matters more than from 100 to 103
- whether they manage anyone at all (0 or 1)

It's fitted with **ordinary least squares**: the normal equations `(XᵀX) w = Xᵀy`, solved with Gaussian elimination. If the data can't separate the features (for example only one person in view manages anyone), the last feature is dropped and it tries again.

- It needs **at least 5 salaries** to train. Fewer, and it shows nothing.
- Anyone paid **more than 25% away** from what the model expects is flagged, with the expected salary shown.
- When adding or editing someone, it suggests a range: the expected salary plus or minus the model's typical error (root mean square error), rounded to R 1 000.
- It trains **in the browser, on the salaries you're allowed to see**, which the API has already filtered. Someone who can only see their own salary gets no insights at all. There's no new endpoint, and nothing new to secure.

We tried a third feature, levels below the top, and dropped it. People reporting straight to a C-level look "senior" by that measure, so it flagged three of them as underpaid. Team size and managing anyone gave a lower error and only two flags, both explainable.

## Consequences

- On the sample data it flags two people: Ruan (a Senior Engineer, paid more than others without a team, which the model can't know is about seniority) and Johan (managing four people on less than the model expects).
- Flags are worded as "worth a look, not a verdict", and say what the model learned from.
- The model is deterministic and fully tested, including that it recovers known weights exactly from data generated with them.
