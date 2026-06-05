# Setu Flow Training Video Plan

## Purpose

This plan prepares the `/training` workspace for future video walkthroughs. Each video should align with one module so the written guide, page content, and video library remain synchronized.

## Recording standards

- Use representative training records only.
- Avoid private buyer, supplier, customer, pricing, and main organization data.
- Avoid showing internal-only tooling.
- Keep each video focused on one outcome.
- Start with what the user is learning, then show the steps, then recap the checks.
- Use the same module names as the `/training` page.

## Recommended video library

| Order | Video title | Target length | Outcome |
|---|---:|---:|---|
| 1 | Workspace orientation and daily queues | 3-5 min | User knows where to begin and how to read daily priorities |
| 2 | Capture a new inquiry | 4-6 min | User can enter a clean inquiry from event, field, or conversation source |
| 3 | Review and qualify the lead | 4-6 min | User can review context, update status, assign owner, and set follow-up |
| 4 | Prepare quote and commercial details | 5-7 min | User can gather quote-ready information and record assumptions |
| 5 | Confirm documents and order readiness | 5-7 min | User can verify required information before execution handoff |
| 6 | Move from ready state to dispatch | 4-6 min | User can update dispatch status, tracking, and post-dispatch follow-up |
| 7 | Use mobile capture in the field | 3-5 min | User can capture a lead quickly from phone and clean it up later |

## Script template

Use this structure for each recording:

```txt
1. Today we are learning: <module title>.
2. This is used by: <role>.
3. Start from: <screen or route>.
4. First check: <important context>.
5. Step-by-step action: <3-5 actions>.
6. Before moving forward, confirm: <checks>.
7. The next step is: <next module or handoff>.
```

## Future file location

When videos are created, store final optimized web versions under:

```txt
public/training/videos
```

Suggested filenames:

```txt
01-workspace-orientation.mp4
02-capture-new-inquiry.mp4
03-qualify-lead.mp4
04-prepare-quote.mp4
05-document-readiness.mp4
06-dispatch-handoff.mp4
07-mobile-field-capture.mp4
```

## Page integration guidance

When videos are ready, add each video beside the matching module card in `src/app/training/page.tsx`.

Keep the written module steps visible even after video is added. Some users will prefer reading, and trainers need the checklist during live onboarding.
