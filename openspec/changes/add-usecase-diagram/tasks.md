# Implementation Tasks: Add Use Case Diagram

## P0 - Core Functionality (Must have for MVP)

### Task 1: Set up basic structure

- **Description**: Create directory structure and core base files
- **Steps**:
  1. Create `packages/pintora-diagrams/src/usecase/` directory
  2. Implement `db.ts` with core type definitions and UseCaseDb class
  3. Implement `config.ts` with configuration definitions and default values
  4. Create empty `parser.ts` and `artist.ts` files
  5. Create basic `index.ts` with placeholder diagram registration
- **Acceptance**: Directory structure exists, type definitions compile without errors

### Task 2: Implement parser for basic syntax

- **Description**: Implement Nearley grammar and parser for core use case diagram syntax
- **Steps**:
  1. Write `parser/useCaseDiagram.ne` grammar file supporting:
     - Diagram type declaration (`useCaseDiagram`)
     - Actor definition (`actor Name as alias`)
     - Use case definition (`(Use Case Name) as alias`)
     - Basic association relationships (`Actor --> (UseCase)`)
  2. Compile grammar to TypeScript
  3. Implement `parser.ts` with parsing logic, integrating with UseCaseDb
  4. Add validation for duplicate actor/use case names
- **Acceptance**: Parser can parse basic use case diagram text and generate correct IR

### Task 3: Implement basic rendering

- **Description**: Implement core rendering logic for actors, use cases, and association relationships
- **Steps**:
  1. Implement `artist.ts` extending BaseArtist
  2. Reuse sequence diagram's `drawActor` method for actor rendering
  3. Implement use case (ellipse) rendering with auto text sizing
  4. Implement association relationship line rendering
  5. Integrate Dagre layout for automatic node positioning
- **Acceptance**: Basic diagrams render correctly with actors, use cases, and connections

### Task 4: Register and test basic functionality

- **Description**: Register the diagram type and add basic tests
- **Steps**:
  1. Complete `index.ts` with proper `defineDiagram` registration
  2. Export the diagram in `packages/pintora-diagrams/src/index.ts`
  3. Add basic snapshot tests for core functionality
  4. Test rendering in browser/Node.js environments
- **Acceptance**: Basic use case diagrams render successfully in existing demo environment

## P1 - Important Features (Production ready)

### Task 5: Implement system boundary support

- **Description**: Add support for system boundaries (rectangle/package)
- **Steps**:
  1. Extend grammar to support boundary syntax
  2. Update IR and Db to support boundary data
  3. Integrate Dagre Cluster support for boundary layout
  4. Implement boundary rendering with title and inner content
  5. Add tests for nested boundaries
- **Acceptance**: Diagrams with system boundaries render correctly, content is properly contained

### Task 6: Implement advanced relationship types

- **Description**: Add support for include, extend, and generalization relationships
- **Steps**:
  1. Extend grammar to support all relationship types
  2. Update IR and Db to support different relation types
  3. Implement different line/arrow styles for each relationship type
  4. Add support for relation labels and built-in <<include>>/<<extend>> stereotypes
  5. Add tests for all relationship types
- **Acceptance**: All standard UML relationship types render correctly per specification

### Task 7: Theme and configuration integration

- **Description**: Full integration with pintora's theme and configuration system
- **Steps**:
  1. Ensure all style values are pulled from configuration, no hardcoded values
  2. Test with light/dark themes
  3. Support diagram-level configuration overrides
  4. Add configuration documentation
- **Acceptance**: Diagrams respect global and local configuration, work correctly with all built-in themes

## P2 - Enhancement Features

### Task 8: Add note support

- **Description**: Implement note functionality
- **Steps**:
  1. Extend grammar to support note syntax
  2. Implement note rendering with position support (left/right/top/bottom)
  3. Add multi-line note support
- **Acceptance**: Notes render correctly in specified positions

### Task 9: Add advanced syntax features

- **Description**: Implement additional convenient syntax
- **Steps**:
  1. Add support for direction hints in relationships (`Actor --left--> (UseCase)`)
  2. Add support for stereotype display on actors/use cases
  3. Add title support
- **Acceptance**: Advanced syntax features work as expected

### Task 10: Optimization and polish

- **Description**: Performance optimization and quality improvements
- **Steps**:
  1. Optimize layout for large diagrams
  2. Add edge weight configuration to reduce line crossing
  3. Add comprehensive test coverage (>90%)
  4. Add documentation and examples
- **Acceptance**: Implementation is performant, well-tested, and documented

## Dependencies

- P0 tasks must be completed before starting P1 tasks
- P1 tasks must be completed before starting P2 tasks
