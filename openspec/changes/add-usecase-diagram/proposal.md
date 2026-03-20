# Proposal: Add Use Case Diagram Support

## 1. Change Overview

Add UML Use Case Diagram support to pintora, allowing users to render use case diagrams from plain text DSL.

## 2. Background & Motivation

- **User Request**: Issue #370 explicitly requests use case diagram functionality
- **Market Gap**: Mermaid currently lacks official use case diagram support, PlantUML is the de facto standard but heavyweight
- **Use Case**: Use case diagrams are widely used in software requirements analysis, system design, and documentation
- **User Base**: Expands pintora's applicability to business analysts, product managers, and system architects

## 3. Goals

- Implement complete use case diagram rendering capability
- Maintain compatibility with mainstream PlantUML use case diagram syntax to minimize user learning cost
- Seamlessly integrate with existing pintora architecture, reusing core components as much as possible
- Support all standard UML use case diagram elements: actors, use cases, system boundaries, and all relationship types
- Fully compatible with existing theme system and configuration mechanism

## 4. Non-Goals

- Inventing a new proprietary use case diagram DSL
- Supporting non-standard UML use case diagram extensions in the first version
- Custom layout engine implementation (reuse existing Dagre layout)

## 5. Expected Benefits

- Enrich pintora's diagram type ecosystem
- Meet the needs of requirements analysis and system design scenarios
- Attract more users from the PlantUML/Mermaid community
- Maintain architectural consistency, no additional maintenance burden on core systems
