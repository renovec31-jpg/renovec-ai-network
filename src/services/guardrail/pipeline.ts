// ══════════════════════════════════════════════════════════════════════════════
// RENOVEC Output Guardrail Pipeline
// generate -> evaluate -> rewrite if needed -> re-evaluate -> publish or fallback
// ══════════════════════════════════════════════════════════════════════════════

import type { EvaluationContext, PipelineResult } from './types';
import { FALLBACK_MESSAGES, THRESHOLDS } from './types';
import { evaluate } from './evaluator';
import { rewrite } from './rewriter';
import { recordEntry } from './memory';

export function runPipeline(
  generatedOutput: string,
  context: EvaluationContext
): PipelineResult {
  const startTime = performance.now();

  // Step 1: Evaluate generated output
  const firstEval = evaluate(generatedOutput, context);

  // Step 2: If passes, publish directly
  if (firstEval.decision === 'pass') {
    const result: PipelineResult = {
      finalOutput: generatedOutput,
      originalOutput: generatedOutput,
      wasRewritten: false,
      evaluation: firstEval,
      usedFallback: false,
      pipelineMs: performance.now() - startTime,
    };
    recordEntry(result, context);
    return result;
  }

  // Step 3: If blocked (< 65), use fallback
  if (firstEval.decision === 'block') {
    const fallback = FALLBACK_MESSAGES[context.userMode];
    const fallbackEval = evaluate(fallback, context);
    const result: PipelineResult = {
      finalOutput: fallback,
      originalOutput: generatedOutput,
      wasRewritten: false,
      evaluation: firstEval,
      rewriteEvaluation: fallbackEval,
      usedFallback: true,
      pipelineMs: performance.now() - startTime,
    };
    recordEntry(result, context);
    return result;
  }

  // Step 4: Rewrite (score 65-85)
  const rewriteResult = rewrite(generatedOutput, firstEval, context);

  // Step 5: Re-evaluate rewritten output
  const secondEval = evaluate(rewriteResult.rewritten, context);

  // Step 6: If rewrite passes or is better, use it
  if (secondEval.overallScore >= THRESHOLDS.PASS || secondEval.overallScore > firstEval.overallScore) {
    const result: PipelineResult = {
      finalOutput: rewriteResult.rewritten,
      originalOutput: generatedOutput,
      wasRewritten: true,
      evaluation: firstEval,
      rewriteEvaluation: secondEval,
      usedFallback: false,
      pipelineMs: performance.now() - startTime,
    };
    recordEntry(result, context);
    return result;
  }

  // Step 7: Rewrite didn't improve enough — use fallback
  const fallback = FALLBACK_MESSAGES[context.userMode];
  const result: PipelineResult = {
    finalOutput: fallback,
    originalOutput: generatedOutput,
    wasRewritten: true,
    evaluation: firstEval,
    rewriteEvaluation: secondEval,
    usedFallback: true,
    pipelineMs: performance.now() - startTime,
  };
  recordEntry(result, context);
  return result;
}
