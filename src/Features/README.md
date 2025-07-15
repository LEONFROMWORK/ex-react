# Vertical Slice Architecture Guide

## Overview

This project follows Vertical Slice Architecture (VSA) as defined in `Architecture.md`. Each feature is self-contained with its own request, response, handler, validator, and any feature-specific logic.

## Structure

```
src/
├── Features/              # All features organized by business capability
│   ├── ExcelUpload/      # Upload Excel files
│   ├── ExcelAnalysis/    # Analyze Excel errors
│   ├── ExcelCorrection/  # Apply corrections to Excel files
│   └── Authentication/   # User authentication
├── Common/               # Truly shared components (Result pattern, Errors)
├── Infrastructure/       # External service implementations
└── Host/                # Application entry points and cross-cutting concerns
```

## Creating a New Feature

1. Create a new folder under `Features/` with the feature name
2. Create a single file containing Request, Response, Handler, and Validator
3. Follow this pattern:

```typescript
// Features/YourFeature/YourAction.ts

import { z } from "zod";
import { Result } from "@/Common/Result";

// Request Schema
export const YourActionRequestSchema = z.object({
  // Define your request properties
});

export type YourActionRequest = z.infer<typeof YourActionRequestSchema>;

// Response Type
export interface YourActionResponse {
  // Define your response properties
}

// Validator
export class YourActionValidator {
  static validate(request: YourActionRequest): Result<void> {
    // Validation logic
  }
}

// Handler
export class YourActionHandler {
  async handle(request: YourActionRequest): Promise<Result<YourActionResponse>> {
    // Business logic
  }
}
```

## Key Principles

1. **Feature-First**: Each slice handles one clear business function
2. **Self-Contained**: Include everything needed for the feature in one place
3. **Result Pattern**: Use Result<T> for all business operations
4. **Progressive Enhancement**: Start simple, add complexity as needed
5. **Controlled Duplication**: Allow duplication between features

## Testing Strategy

Focus on subcutaneous tests that test the entire slice:

```typescript
describe("YourFeature", () => {
  it("should handle the complete flow", async () => {
    // Arrange
    const request = { /* your request */ };
    
    // Act
    const result = await handler.handle(request);
    
    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value).toMatchObject({ /* expected response */ });
  });
});
```

## Common Patterns

### Error Handling
```typescript
if (!validationResult.isSuccess) {
  return Result.failure(validationResult.error);
}
```

### Feature-Specific Interfaces
```typescript
// Define in the feature file
export interface IYourService {
  doSomething(): Promise<Result<Something>>;
}

// Implement in Infrastructure
export class YourService implements IYourService {
  // Implementation
}
```

### Domain Rules
```typescript
export class YourDomainRules {
  static readonly constants = { /* ... */ };
  static businessRule(input: any): boolean { /* ... */ }
}
```