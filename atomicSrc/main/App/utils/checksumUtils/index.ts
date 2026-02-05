import type { SavedGameState } from '../../types/persistence';

/**
 * Represents a node in the Merkle Tree.
 * - Leaf nodes contain the hash of the data segment.
 * - Branch nodes contain the hash of their children's combined hashes.
 */
export interface ChecksumNode {
  hash: string;
  children?: Record<string, ChecksumNode>;
}

/**
 * The "Shadow Manifest" stored separately from the game data.
 * Contains the root hash and the full tree structure for verification.
 */
export interface ChecksumManifest {
  timestamp: number;
  root: ChecksumNode;
  schemaVersion: number;
}

export interface VerificationResult {
  isValid: boolean;
  mismatches: string[]; // Paths to mismatched nodes (e.g., "root.score")
}

const SCHEMA_VERSION = 1;

/**
 * Simple string hash function (DJB2 variant or similar).
 * Fast and sufficient for integrity checks (not cryptographic security).
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i); /* hash * 33 + c */
    hash = hash & hash; // Convert to 32bit integer
  }
  return (hash >>> 0).toString(16); // Unsigned hex string
}

/**
 * Hashes a leaf value (raw data).
 * Uses JSON.stringify for deterministic serialization.
 */
function hashLeaf(data: any): string {
  if (data === undefined) return 'undefined';
  if (data === null) return 'null';
  // Sort keys for deterministic object hashing
  const str = JSON.stringify(data, (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted: any, k) => {
          sorted[k] = value[k];
          return sorted;
        }, {});
    }
    return value;
  });
  return hashString(str);
}

/**
 * Hashes a branch node.
 * STRICTLY hashes ONLY the concatenated hashes of its children.
 * Does NOT look at raw data.
 */
function hashBranch(children: Record<string, ChecksumNode>): string {
  // Sort keys to ensure consistent order (e.g., "score" then "tiles")
  const sortedKeys = Object.keys(children).sort();
  const combinedHashes = sortedKeys.map((key) => `${key}:${children[key].hash}`).join('|');
  return hashString(combinedHashes);
}

/**
 * Generates the Merkle Tree for the SavedGameState.
 * This defines the "Strict Hierarchy".
 */
export function generateChecksumManifest(state: SavedGameState): ChecksumManifest {
  // 1. Generate Leaf Nodes
  const scoreNode: ChecksumNode = { hash: hashLeaf(state.score) };
  const tilesNode: ChecksumNode = { hash: hashLeaf(state.tiles) };
  const nextShapesNode: ChecksumNode = { hash: hashLeaf(state.nextShapes) };
  const savedShapeNode: ChecksumNode = { hash: hashLeaf(state.savedShape) };
  const statsNode: ChecksumNode = { hash: hashLeaf(state.stats) };

  // Optional/Other fields can be grouped or hashed individually
  // For now, we'll group remaining metadata
  const metadata = {
    totalLinesCleared: state.totalLinesCleared,
    shapesUsed: state.shapesUsed,
    hasPlacedFirstShape: state.hasPlacedFirstShape,
    lastUpdated: state.lastUpdated,
    // Exclude 'checksum' if it exists in the type (legacy)
  };
  const metadataNode: ChecksumNode = { hash: hashLeaf(metadata) };

  // 2. Construct the Tree Structure
  const children: Record<string, ChecksumNode> = {
    score: scoreNode,
    tiles: tilesNode,
    nextShapes: nextShapesNode,
    savedShape: savedShapeNode,
    stats: statsNode,
    metadata: metadataNode,
  };

  // 3. Calculate Root Hash (Branch Hash)
  const rootHash = hashBranch(children);

  const root: ChecksumNode = {
    hash: rootHash,
    children,
  };

  return {
    timestamp: Date.now(),
    schemaVersion: SCHEMA_VERSION,
    root,
  };
}

/**
 * Verifies the data against the manifest.
 * Reconstructs the tree from data and compares it to the manifest.
 */
export function verifyChecksumManifest(data: SavedGameState, manifest: ChecksumManifest): VerificationResult {
  const mismatches: string[] = [];

  // 1. Re-generate the tree from the loaded data
  const calculatedManifest = generateChecksumManifest(data);

  // 2. Compare Root
  if (calculatedManifest.root.hash === manifest.root.hash) {
    return { isValid: true, mismatches: [] };
  }

  mismatches.push('root');

  // 3. Drill down to find specific mismatches
  const storedChildren = manifest.root.children || {};
  const calculatedChildren = calculatedManifest.root.children || {};

  const allKeys = new Set([...Object.keys(storedChildren), ...Object.keys(calculatedChildren)]);

  for (const key of allKeys) {
    const storedNode = storedChildren[key];
    const calculatedNode = calculatedChildren[key];

    if (!storedNode) {
      mismatches.push(`root.${key} (missing in manifest)`);
      continue;
    }
    if (!calculatedNode) {
      mismatches.push(`root.${key} (missing in data)`);
      continue;
    }

    if (storedNode.hash !== calculatedNode.hash) {
      mismatches.push(`root.${key}`);
      // If we had deeper levels, we would recurse here.
      // Since our current tree is flat (Root -> Leaves), we stop here.
    }
  }

  return { isValid: false, mismatches };
}
