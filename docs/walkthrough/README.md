# Video walkthrough

`prodops-walkthrough.mp4` (about 3.5 minutes, 1280×800, captions on screen, no sound) shows every click from an empty app to a running product.

1. **Start** — first open, "New project": no sample content.
2. **The brief** — type the brief, name the project.
3. **Draft specs** — the recognised pattern, then "Draft all five roles".
4. **Review and approve** — edit the business and design requirements, approve Requirements & scope.
5. **Standards** — apply the "UI consistency" rule set.
6. **Design system** — change the primary colour, add a danger colour, say what the product is for, then add the system to the project.
7. **Scope & milestones** — edit and save the scope; milestones follow its order.
8. **Readiness and hand-off** — mark downstream roles reviewed, read the 19 passing checks, download the agent pack.
9. **Open the worked example** — the finished project.
10. **Use the application** — register a patient (bad phone number refused), book a visit, try to double-book (refused with the clashing time), confirm, mark arrived, try to complete (refused until the note is signed), write and sign the note, complete the visit.

The video was recorded from the static build, the same one served on GitHub Pages, by a script driving headless Chrome (screenshots after each action, joined into a video). Nothing was faked: each click ran in the app. The agent that builds the milestones is not shown; the worked example stands in for its result.

The files it produced are in `examples/clinic-front-desk/`.
