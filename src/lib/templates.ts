/**
 * What to ask for in each kind of work. A bounty is easier to finish, and far easier to review, when the proof is named
 * and the criteria are things a person can answer yes or no to. These are suggestions the creator can edit freely; they
 * are never added to a bounty without the creator choosing to use them.
 */

export interface SectorTemplate {
  /** The proof to ask for. */
  proof: string
  /** Acceptance criteria as yes or no points. */
  criteria: string[]
  /** What the contributor should include when they submit. */
  instructions: string
}

export const PROOF: Record<string, string> = {
  security: 'A written report with steps to reproduce. Turn on encrypted reports for anything sensitive.',
  development: 'A pull request link. Its state and author are read from GitHub and shown next to the submission.',
  design: 'Source files or a public prototype link, with the usage rights stated.',
  research: 'A report with its sources and the data behind each claim.',
  community: 'Public links to the posts, threads or sessions, with the results the task asked for.',
  testing: 'A test report with the steps taken, what was found and how to repeat it.',
  'smart-contracts': 'A branch or pull request with passing tests and a short note on what the tests cover.',
  docs: 'The published page or a pull request, tested by following it on a clean setup.',
  content: 'The published article link, with sources and the length the task asked for.',
  translation: 'The translated files or a pull request, reviewed by a second native speaker.',
  video: 'A public link and the source project file, with captions where the task asks for them.',
  marketing: 'A log of what was sent, who replied and what came of it.',
  data: 'A public dashboard link with the queries linked, so the numbers can be rerun.',
  governance: 'The proposal text or forum link, with the template or worked example the task asked for.',
  defi: 'A reproducible notebook or model, with the scenarios and a written conclusion.',
  ai: 'A repository with a documented tool and a passing test run.',
  infrastructure: 'The configuration, a runbook and proof that a test alert fired.',
  payments: 'A working demo that completes a test payment, plus the pull request.',
  games: 'Layered source files and a delivery note that states the usage rights.',
  education: 'The outline, slides and exercises, or a recording of the session.',
  events: 'A recording or summary, the attendance list and the follow-up post.',
  support: 'A log of the tickets triaged or questions answered, with links.',
}

const SUBMIT = 'Link the delivered work and say how it meets each point of the criteria.'

export const TEMPLATES: Record<string, SectorTemplate> = {
  security: { proof: PROOF.security, criteria: ['The report names the weakness and where it is', 'It has steps that reproduce it', 'It states the impact and a suggested fix', 'It is not already known or reported'], instructions: 'Send the report encrypted. Do not publish details before the creator has answered.' },
  development: { proof: PROOF.development, criteria: ['A pull request is open against the repository', 'The change fixes the described problem', 'Existing tests pass and new tests cover the change', 'The code follows the project style'], instructions: 'Link the pull request and describe how you tested it.' },
  design: { proof: PROOF.design, criteria: ['Files are delivered in the format asked for', 'The design follows the brief and brand rules', 'Usage rights are stated', 'Source files are included'], instructions: 'Link the files or prototype and state the usage rights.' },
  research: { proof: PROOF.research, criteria: ['Every claim has a source', 'The data can be rechecked', 'The report answers the stated question', 'Method and limits are explained'], instructions: 'Link the report and the underlying data.' },
  community: { proof: PROOF.community, criteria: ['The posts or sessions are public', 'They match the brief', 'The agreed result is shown with evidence', 'No spam or fake accounts were used'], instructions: 'Link each post or session and show the results.' },
  testing: { proof: PROOF.testing, criteria: ['Each step taken is listed', 'Every finding has steps to repeat it', 'Findings are not duplicates of known issues', 'The test covered the areas named in the brief'], instructions: 'Send the test report with screenshots or logs.' },
  'smart-contracts': { proof: PROOF['smart-contracts'], criteria: ['Tests pass on a clean checkout', 'The tests cover the cases named in the brief', 'No test was weakened to pass', 'A short note explains what is covered'], instructions: 'Link the branch or pull request and the test run.' },
  docs: { proof: PROOF.docs, criteria: ['A new reader can follow it to the end', 'Every command and code sample works', 'It is published or in a pull request', 'It matches the product as it is now'], instructions: 'Link the page or pull request and say how you tested it.' },
  content: { proof: PROOF.content, criteria: ['The piece is published at a public link', 'It meets the length asked for', 'Sources are cited', 'It is original and not machine-translated'], instructions: 'Link the published piece.' },
  translation: { proof: PROOF.translation, criteria: ['Every string or page is translated', 'A second native speaker reviewed it', 'Terms follow the glossary', 'Formatting and placeholders are intact'], instructions: 'Link the files or pull request and name the reviewer.' },
  video: { proof: PROOF.video, criteria: ['The video is at a public link', 'It runs for the length asked for', 'Captions are included if requested', 'The source project file is delivered'], instructions: 'Link the video and the project file.' },
  marketing: { proof: PROOF.marketing, criteria: ['The log lists every contact made', 'Replies are recorded with dates', 'The target number of qualified contacts is met', 'No spam or purchased lists were used'], instructions: 'Link the outreach log and summarise the results.' },
  data: { proof: PROOF.data, criteria: ['The dashboard is public', 'The queries are linked and can be rerun', 'The totals match an independent check', 'It refreshes on the schedule asked for'], instructions: 'Link the dashboard and the queries.' },
  governance: { proof: PROOF.governance, criteria: ['The proposal follows the required template', 'It includes a worked example', 'It is posted where the community can read it', 'It addresses the questions in the brief'], instructions: 'Link the proposal text or forum post.' },
  defi: { proof: PROOF.defi, criteria: ['The model runs from the notebook without edits', 'Each scenario in the brief is covered', 'Assumptions are written down', 'A written conclusion answers the question'], instructions: 'Link the notebook and the conclusion.' },
  ai: { proof: PROOF.ai, criteria: ['The tool is documented', 'A test run passes in the repository', 'It works with the client named in the brief', 'No secrets are committed'], instructions: 'Link the repository and the test run.' },
  infrastructure: { proof: PROOF.infrastructure, criteria: ['Checks and alerts are deployed', 'A runbook explains what to do on an alert', 'A test alert was triggered and shown', 'Configuration is in version control'], instructions: 'Link the configuration and show the test alert.' },
  payments: { proof: PROOF.payments, criteria: ['A test payment completes end to end', 'The code is in a pull request', 'Merchant usage notes are included', 'It handles a failed payment'], instructions: 'Link the demo and the pull request.' },
  games: { proof: PROOF.games, criteria: ['The number of pieces asked for is delivered', 'Layered source files are included', 'Usage rights are stated', 'The style matches the brief'], instructions: 'Link the files and the delivery note.' },
  education: { proof: PROOF.education, criteria: ['The outline covers the topics in the brief', 'Slides and exercises are included', 'The length fits the session', 'A feedback form is ready'], instructions: 'Link the materials or the recording.' },
  events: { proof: PROOF.events, criteria: ['The event took place as planned', 'A recording or summary is public', 'The attendance list is provided', 'A follow-up post is published'], instructions: 'Link the recording, the list and the post.' },
  support: { proof: PROOF.support, criteria: ['Every item in scope is handled', 'Duplicates are linked', 'A summary of the main themes is written', 'Answers are accurate and polite'], instructions: 'Link the log and the summary.' },
}

export const templateFor = (slug: string): SectorTemplate | null => TEMPLATES[slug] ?? null
export { SUBMIT as DEFAULT_INSTRUCTIONS }
