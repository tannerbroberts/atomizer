# Atomizer

A CLI tool to reorganize React/TypeScript folder structures using AST traversal and refactoring techniques. The goal is to enforce **"Architecture-as-Code"** where the file system reflects the React Render Tree (composability) first.

## Architecture

This tool has distinct phases with an output artifact for each:

1. Index all src files:
   - Crawl the src directory, parsing every .js, .jsx, .ts, and .tsx file
   - For every top-level node in the AST representation of a file, add a uuid-key to a project map with that node as an object.
   - Add a custom property to each node called file-path, which is an absolute file path to the file from who's AST the nodes are gleaned.
   - Keep a separate index map for imports, referencing the same objects by the same uuid key
   - Keep a separate index map for exports, referencing the same objects by the same uuid key
   - Keep a separate index map for declarations, referencing the same objects by the same uuid key
   - That's a total of 4 maps: project, imports, exports, and declarations
2. Build dependent objects:
   - For every declaration node in the project, find it's usage throughout the enire application.
      - Trace through the node's own AST for internal usage of the name within module scope, storing the uuid's of the top-level nodes within which it is found (other than itself, of course) under [uuid].dependant.internal array
         - If duplicate usage is found within a single top-level node, recording only one instance of the uuid is sufficient.
      - If a declaration is also exported, trace through all file imports for a list of where that symbol is imported from it's file
         - Make sure we can trace through every type of export/import syntax there is.
         - Perform the same module tracing logic for each module that imports the original declaration
         - Save these under [uuid].dependant.external.[consumingUuid], no need to specify the file path of the consumer. It can be looked up
      - If the importing file is re-exporting the variable who's declaration we're tracing, recursively follow the import lookup for the re-export as well
3. Build
   - We'll talk about this later, I just want to trace.