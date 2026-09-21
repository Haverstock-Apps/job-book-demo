# Job Book demo

A tiny site for **Beat 6** of the Job Book demo (`~/AI-Projects/JOB-BOOK-DEMO-SCRIPT.md`): the beat where an
agent says a step is done, and Job Book refuses because the change is merged but not yet live.

Every push to `main` is tested, built and published to GitHub Pages. The published `version.json` holds the
commit that build came from:

```
{"commit":"<full commit id>"}
```

So there is always a gap between **merged** (the PR lands on `main`) and **live** (Pages serves the new
`version.json`). That gap is what Beat 6 shows.

## The job to give the agent on stage

```
Change the greeting on the home page to "Hello from Job Book.", with a test.
```

`src/greeting.js` holds the greeting; `test/greeting.test.js` checks it. Keep the change that small.

## The live check

Registered once per workspace:

```
preflight live add job-book-demo --repo Haverstock-Apps/job-book-demo --url https://haverstock-apps.github.io/job-book-demo/version.json --field commit
```

## Run it locally

```
npm test
GITHUB_SHA=$(git rev-parse HEAD) npm run build
```
