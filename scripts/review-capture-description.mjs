// Authored descriptions of each reviewed UI state; captions retain capture IDs.
const views = {
  'authoring-overview-image': 'Image authoring controls for the Overview artwork, including alt text, treatment and focal position.',
  overview: 'Lesson opening with its title, summary and authored Overview image slot.',
  outcomes: 'Learning outcomes beside the authored outcomes image slot.',
  completion: 'Lesson completion hero with its authored artwork and links to revisit learning.',
  complete: 'Lesson completion page with access to permitted answers and practice review.',
  'answer-authoring': 'Teacher controls for final-answer and worked-solution access policies.',
  'balanced-scaffolds': 'Structured exercise questions arranged beside their matched subparts.',
  'final-answers': 'Answer Hub showing concise final answers in a dense question list.',
  foundation: 'Foundation practice questions arranged for exercise-book responses.',
  moderate: 'Moderate practice questions using the same taught method.',
  hub: 'Bounded Answer Hub with answer tabs and filters above independently scrolling solutions.',
  locked: 'Answer Hub showing the current answer-access restriction.',
  'long-expression': 'A long worked expression using line-level horizontal scrolling inside the Answer Hub.',
  'long-solution': 'An extended worked solution using the full Answer Hub content width.',
  'media-fixture-authoring': 'Image authoring controls using a labelled repository sample image, rather than the approved Algebra artwork.',
  'media-fixture-overview': 'Overview image slot populated with a labelled sample fixture to check cover and focal settings.',
  'media-fixture-outcomes': 'Outcomes image slot populated with a labelled sample fixture to check placement.',
  'media-fixture-completion': 'Completion hero populated with a labelled sample fixture to check contain treatment.',
  'mixed-order': 'Mixed compact, multipart and extended practice questions retaining authored order.',
  'multipart-authoring': 'Question inspector editing multipart presentation and structured subparts.',
  'native-200': 'Answer Hub at actual 200 percent browser zoom, keeping controls and solutions within the viewport.',
  'odd-scaffold-fixture': 'An odd number of structured questions, with the final question filling its row.',
  'parts-editor': 'Authoring controls for editing and duplicating individual question subparts.',
  practice: 'Dense practice layout with pathway controls and exercise-book questions.',
  'practice-native-200': 'Practice questions reflowed at actual 200 percent browser zoom.',
  projector: 'Projector mode displaying worked solutions for the teacher.',
  'question-authoring': 'Question inspector with answer, presentation and teacher-note fields.',
  scaffold: 'Structured practice questions and their subparts at tablet width.',
  'worked-solutions': 'Answer Hub showing mathematical working for permitted practice answers.',
  'scaffold-full': 'An extended scaffold question spanning the exercise area.',
  'stress-28': 'A stress fixture with 28 independent questions in one practice pathway.',
  'structure-edit-compact-inspector': 'Compact question authoring grid alongside the open inspector.',
  'structure-edit-multipart-inspector': 'Multipart question authoring grid alongside the open inspector.',
  'structure-final-answers-dense': 'Dense final-answer list within the bounded Answer Hub.',
  'structure-hub': 'Responsive Answer Hub with accessible controls and scrolling answer content.',
  'structure-hub-top-desktop': 'Top of the Answer Hub content while its header, filters and close control remain visible.',
  'structure-hub-middle-desktop': 'Middle of the independently scrolling Answer Hub content with fixed controls visible.',
  'structure-hub-bottom-desktop': 'Bottom of the independently scrolling Answer Hub content with fixed controls visible.',
  'structure-long-full-width-fixture': 'Long worked-solution fixture promoted to the full width of the Answer Hub.',
  'structure-practice-toolbar-desktop': 'Practice answer toolbar above dense exercise questions.'
};
/** Return an authored UI-state description plus its viewport/scroll context; reject unknown capture states. */
export function captureDescription(file) {
  let state = file.replace(/\.png$/, '');
  const lesson = state.startsWith('expanding-two-binomials-') ? 'Expanding two binomials' : state.startsWith('expanding-binomial-trinomial-') ? 'Expanding a binomial by a trinomial' : 'Mathematics structural review';
  state = state.replace(/^expanding-(?:two-binomials|binomial-trinomial)-/, '');
  const image = state.endsWith('-image') && !views[state];
  if (image) state = state.slice(0, -6);
  const viewport = state.match(/-(1536|1280|1024|390)$/)?.[1];
  if (viewport) state = state.slice(0, -(viewport.length + 1));
  const zoom = state.endsWith('-native-200') && !views[state];
  if (zoom) state = state.slice(0, -11);
  const tablet = state.endsWith('-tablet');
  if (tablet) state = state.slice(0, -7);
  if (!views[state]) throw Error('Missing authored screenshot description: ' + file);
  return `${lesson}: ${views[state]}${viewport ? ` Captured at ${viewport}px viewport width.` : ''}${tablet ? ' Tablet layout.' : ''}${zoom ? ' Actual 200 percent browser zoom.' : ''}${image ? ' Scrolled to show artwork below the initial viewport.' : ''}`;
}
