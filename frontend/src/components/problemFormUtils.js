export const LANGUAGES = ['C++', 'Java', 'JavaScript'];

// Build form defaults, optionally from an existing problem (for editing)
export const buildDefaults = (problem) => ({
  title: problem?.title ?? '',
  description: problem?.description ?? '',
  difficulty: problem?.difficulty ?? 'easy',
  tags: problem?.tags ?? 'array',
  visibleTestCases: problem?.visibleTestCases?.length
    ? problem.visibleTestCases.map(({ input, output, explanation }) => ({ input, output, explanation }))
    : [{ input: '', output: '', explanation: '' }],
  hiddenTestCases: problem?.hiddenTestCases?.length
    ? problem.hiddenTestCases.map(({ input, output }) => ({ input, output }))
    : [{ input: '', output: '' }],
  startCode: LANGUAGES.map((language) => ({
    language,
    initialCode: problem?.startCode?.find((s) => s.language === language)?.initialCode ?? '',
  })),
  referenceSolution: LANGUAGES.map((language) => ({
    language,
    completeCode: problem?.referenceSolution?.find((s) => s.language === language)?.completeCode ?? '',
  })),
});

