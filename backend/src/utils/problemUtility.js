const axios = require('axios');

/**
 * JDoodle API Language Configuration
 * ONLY C++, Java, and JavaScript (Node.js) are supported.
 *
 * Mapping details:
 * - C++: JDoodle identifier 'cpp', versionIndex '4' (GCC 9.1.0, matching Judge0's GCC 9.2.0)
 * - Java: JDoodle identifier 'java', versionIndex '4' (JDK 17.0.1, closest LTS supporting Java 13 features)
 * - JavaScript: JDoodle identifier 'nodejs', versionIndex '3' (Node.js 12.11.1, matching Judge0's Node.js 12.14.0)
 */
const JDOODLE_LANGUAGE_MAP = {
  'c++': {
    language: 'cpp',
    versionIndex: '4',
    displayName: 'C++'
  },
  'cpp': {
    language: 'cpp',
    versionIndex: '4',
    displayName: 'C++'
  },
  'java': {
    language: 'java',
    versionIndex: '4',
    displayName: 'Java'
  },
  'javascript': {
    language: 'nodejs',
    versionIndex: '3',
    displayName: 'JavaScript (Node.js)'
  },
  'nodejs': {
    language: 'nodejs',
    versionIndex: '3',
    displayName: 'JavaScript (Node.js)'
  }
};

/**
 * Returns JDoodle language config for a given language string.
 */
const getLanguageConfig = (lang) => {
  if (!lang || typeof lang !== 'string') return null;
  const key = lang.trim().toLowerCase();
  return JDOODLE_LANGUAGE_MAP[key] || null;
};


/**
 * Normalize output string for reliable test case comparison.
 * Normalizes CRLF to LF, trims line-end whitespace, and trims leading/trailing newlines.
 */
const normalizeOutput = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
};

/**
 * Detect timeout in execution output
 */
const isTimeout = (output) => {
  if (!output) return false;
  const lower = output.toLowerCase();
  return (
    lower.includes('execution timed out') ||
    lower.includes('execute failed: timeout') ||
    lower.includes('time limit exceeded') ||
    output.trim() === 'Timeout' ||
    /^timeout\b/i.test(output.trim())
  );
};

/**
 * Detect compilation error in compiler output
 */
const isCompilationError = (output, language) => {
  if (!output) return false;
  const lang = (language || '').toLowerCase();
  if (lang === 'javascript' || lang === 'nodejs') {
    return output.includes('SyntaxError:');
  }
  if (lang === 'c++' || lang === 'cpp') {
    return (
      /: error:/i.test(output) ||
      /: fatal error:/i.test(output) ||
      /\bcompilation error\b/i.test(output)
    );
  }
  if (lang === 'java') {
    return (
      /: error:/i.test(output) ||
      /\b\d+\s+error(s)?\b/i.test(output) ||
      output.includes('error: cannot find symbol') ||
      output.includes("error: ';' expected")
    );
  }
  return /: error:/i.test(output) || output.includes('SyntaxError:');
};

/**
 * Detect runtime error (crashes, unhandled exceptions)
 */
const isRuntimeError = (output, language) => {
  if (!output) return false;
  const lang = (language || '').toLowerCase();
  if (lang === 'javascript' || lang === 'nodejs') {
    return (
      output.includes('TypeError:') ||
      output.includes('ReferenceError:') ||
      output.includes('RangeError:') ||
      output.includes('URIError:') ||
      output.includes('EvalError:') ||
      /Uncaught \w*Error/i.test(output)
    );
  }
  if (lang === 'c++' || lang === 'cpp') {
    return (
      output.includes('Segmentation fault') ||
      output.includes('core dumped') ||
      output.includes('Floating point exception') ||
      output.includes('Aborted') ||
      output.includes('terminate called') ||
      output.includes('SIGSEGV') ||
      output.includes('SIGFPE') ||
      output.includes('SIGABRT')
    );
  }
  if (lang === 'java') {
    return (
      output.includes('Exception in thread') ||
      output.includes('java.lang.') ||
      output.includes('Error: Could not find or load main class')
    );
  }
  return (
    output.includes('Exception in thread') ||
    output.includes('Segmentation fault') ||
    output.includes('ReferenceError:') ||
    output.includes('TypeError:')
  );
};

/**
 * Determine the submission verdict based on actual output vs expected output.
 * Preserves Judge0 status_id codes:
 * 3: Accepted
 * 4: Wrong Answer
 * 5: Time Limit Exceeded
 * 6: Compilation Error
 * 11: Runtime Error
 */
const determineVerdict = ({ rawOutput, expectedOutput, language }) => {
  const normActual = normalizeOutput(rawOutput);
  const normExpected = normalizeOutput(expectedOutput);

  if (normActual === normExpected) {
    return {
      status_id: 3,
      status: 'accepted',
      verdict: 'Accepted',
      stdout: rawOutput,
      stderr: null
    };
  }

  if (isTimeout(rawOutput)) {
    return {
      status_id: 5,
      status: 'error',
      verdict: 'Time Limit Exceeded',
      stdout: rawOutput,
      stderr: rawOutput
    };
  }

  if (isCompilationError(rawOutput, language)) {
    return {
      status_id: 6,
      status: 'error',
      verdict: 'Compilation Error',
      stdout: rawOutput,
      stderr: rawOutput
    };
  }

  if (isRuntimeError(rawOutput, language)) {
    return {
      status_id: 11,
      status: 'error',
      verdict: 'Runtime Error',
      stdout: rawOutput,
      stderr: rawOutput
    };
  }

  return {
    status_id: 4,
    status: 'wrong',
    verdict: 'Wrong Answer',
    stdout: rawOutput,
    stderr: null
  };
};

/**
 * Execute a single test case with JDoodle Compiler REST API
 */
const executeSingleTestCase = async ({ code, language, stdin, expected_output }) => {
  const langConfig = getLanguageConfig(language);
  if (!langConfig) {
    const error = new Error(`Unsupported language '${language}'. Supported languages: c++, java, javascript`);
    error.statusCode = 400;
    throw error;
  }

  const clientId = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const error = new Error('JDoodle API credentials are not configured. Please set JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET in backend environment variables.');
    error.statusCode = 500;
    throw error;
  }

  let response;
  try {
    response = await axios.post(
      'https://api.jdoodle.com/v1/execute',
      {
        clientId,
        clientSecret,
        script: code,
        language: langConfig.language,
        versionIndex: langConfig.versionIndex,
        stdin: stdin !== undefined && stdin !== null ? String(stdin) : ''
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );
  } catch (err) {
    if (err.response) {
      if (err.response.status === 401) {
        const error = new Error('JDoodle API authentication failed (HTTP 401): Invalid JDOODLE_CLIENT_ID or JDOODLE_CLIENT_SECRET.');
        error.statusCode = 401;
        throw error;
      }
      if (err.response.status === 429) {
        const error = new Error('JDoodle daily API credit allowance exhausted (HTTP 429). Credits reset daily at 23:55 UTC.');
        error.statusCode = 429;
        throw error;
      }
      const error = new Error(`JDoodle API execution error (HTTP ${err.response.status}): ${JSON.stringify(err.response.data || err.message)}`);
      error.statusCode = err.response.status;
      throw error;
    }
    const error = new Error(`JDoodle execution service unavailable: ${err.message}`);
    error.statusCode = 503;
    throw error;
  }

  const data = response.data || {};

  if (data.statusCode === 401 || (data.error && /unauthorized/i.test(data.error))) {
    const error = new Error('JDoodle API authentication failed (HTTP 401): Invalid credentials.');
    error.statusCode = 401;
    throw error;
  }
  if (data.statusCode === 429 || (data.error && /credit/i.test(data.error))) {
    const error = new Error('JDoodle daily API credit allowance exhausted (HTTP 429). Credits reset daily at 23:55 UTC.');
    error.statusCode = 429;
    throw error;
  }

  const rawOutput = data.output !== undefined && data.output !== null ? String(data.output) : '';
  const cpuTime = data.cpuTime !== undefined ? String(data.cpuTime) : '0';
  const memory = data.memory !== undefined ? Number(data.memory) : 0;

  const verdict = determineVerdict({
    rawOutput,
    expectedOutput: expected_output,
    language: langConfig.language
  });

  return {
    stdin: stdin !== undefined && stdin !== null ? String(stdin) : '',
    expected_output: expected_output !== undefined && expected_output !== null ? String(expected_output) : '',
    stdout: verdict.stdout,
    stderr: verdict.stderr,
    time: cpuTime,
    memory: memory,
    status_id: verdict.status_id,
    verdict: verdict.verdict,
    status: verdict.status
  };
};

/**
 * Execute multiple test cases.
 * Handles credit optimization: if test case 1 fails with compilation error,
 * remaining test cases are assigned the compilation error without wasting credits.
 */
const executeTestCases = async (code, language, testCases) => {
  if (!Array.isArray(testCases) || testCases.length === 0) {
    return [];
  }

  const results = [];
  for (const tc of testCases) {
    const result = await executeSingleTestCase({
      code,
      language,
      stdin: tc.input,
      expected_output: tc.output
    });
    results.push(result);

    // If compilation fails, subsequent runs will also fail to compile with identical error.
    // Avoid wasting execution credits by populating the compilation error for remaining cases.
    if (result.status_id === 6) {
      for (let i = results.length; i < testCases.length; i++) {
        results.push({
          stdin: testCases[i].input !== undefined && testCases[i].input !== null ? String(testCases[i].input) : '',
          expected_output: testCases[i].output !== undefined && testCases[i].output !== null ? String(testCases[i].output) : '',
          stdout: result.stdout,
          stderr: result.stderr,
          time: result.time,
          memory: result.memory,
          status_id: 6,
          verdict: 'Compilation Error',
          status: 'error'
        });
      }
      break;
    }
  }

  return results;
};



module.exports = {
  JDOODLE_LANGUAGE_MAP,
  getLanguageConfig,
  normalizeOutput,
  determineVerdict,
  executeSingleTestCase,
  executeTestCases,
};
