import type { TaskFromAPI } from "@scholaros/shared";

export interface DuplicateMatch {
  task: TaskFromAPI;
  confidence: number; // 0-100
  matchType: "exact" | "similar" | "partial";
}

/**
 * Calculate similarity score between two strings using word overlap.
 * Returns a value between 0 and 1.
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Substring containment is a strong signal
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  // Word overlap scoring
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "is", "it", "as", "be", "do", "my", "up",
  ]);

  const tokenize = (s: string) =>
    s.split(/\s+/).filter((w) => w.length > 1 && !stopWords.has(w));

  const words1 = new Set(tokenize(s1));
  const words2 = new Set(tokenize(s2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let matches = 0;
  for (const w of words1) {
    if (words2.has(w)) {
      matches++;
    } else {
      // Check prefix overlap (e.g., "review" matches "reviewing")
      for (const w2 of words2) {
        if (
          (w.length >= 4 && w2.startsWith(w.slice(0, 4))) ||
          (w2.length >= 4 && w.startsWith(w2.slice(0, 4)))
        ) {
          matches += 0.5;
          break;
        }
      }
    }
  }

  return matches / Math.max(words1.size, words2.size);
}

/**
 * Determine the match type based on the confidence score.
 */
function getMatchType(confidence: number): DuplicateMatch["matchType"] {
  if (confidence >= 90) return "exact";
  if (confidence >= 60) return "similar";
  return "partial";
}

/**
 * Find potential duplicate tasks based on title similarity.
 *
 * Compares the new task title against existing tasks using word overlap
 * and prefix matching. Only considers incomplete tasks.
 *
 * @param newTaskTitle - The title of the task being created
 * @param existingTasks - Array of existing tasks to compare against
 * @param threshold - Minimum confidence score (0-100) to consider a match. Default: 40
 * @returns Array of matching tasks sorted by confidence (highest first)
 */
export function findPotentialDuplicates(
  newTaskTitle: string,
  existingTasks: TaskFromAPI[],
  threshold: number = 40
): DuplicateMatch[] {
  const trimmedTitle = newTaskTitle.trim();
  if (trimmedTitle.length < 3) return [];

  const matches: DuplicateMatch[] = [];

  for (const task of existingTasks) {
    // Skip completed tasks
    if (task.status === "done") continue;

    // Calculate title similarity
    const titleSimilarity = stringSimilarity(trimmedTitle, task.title);

    // Also check against description if available
    let descriptionSimilarity = 0;
    if (task.description) {
      descriptionSimilarity = stringSimilarity(trimmedTitle, task.description);
    }

    // Use the higher similarity score, weighted toward title
    const score = Math.max(titleSimilarity, descriptionSimilarity * 0.7);
    const confidence = Math.round(score * 100);

    if (confidence >= threshold) {
      matches.push({
        task,
        confidence,
        matchType: getMatchType(confidence),
      });
    }
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);

  // Return top 5 matches
  return matches.slice(0, 5);
}
