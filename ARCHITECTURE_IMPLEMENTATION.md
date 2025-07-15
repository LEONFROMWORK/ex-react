# Vertical Slice Architecture Implementation

This project has been restructured to follow Vertical Slice Architecture (VSA) as defined in `Architecture.md`. This document provides a summary of the changes and how to use the new architecture.

## New Folder Structure

```
src/
├── Features/              # Vertical slices organized by business capability
│   ├── ExcelUpload/      # File upload functionality
│   │   ├── UploadExcel.ts
│   │   └── UploadExcel.test.ts
│   ├── ExcelAnalysis/    # Excel error analysis
│   │   ├── AnalyzeErrors/
│   │   │   └── AnalyzeErrors.ts
│   │   └── GenerateReport/
│   │       └── GenerateErrorReport.ts
│   ├── ExcelCorrection/  # Apply corrections to Excel files
│   │   └── ApplyCorrections.ts
│   └── Authentication/   # User authentication
│       ├── Login.ts
│       └── Signup.ts
├── Common/               # Shared components (Result pattern, Errors)
│   ├── Result.ts        # Result pattern for error handling
│   └── Errors.ts        # Business error definitions
├── Infrastructure/       # External service implementations
│   └── ExternalServices/
│       └── LocalFileStorage.ts
└── Host/                # Application configuration and cross-cutting concerns
    ├── Program.ts       # Dependency injection and configuration
    ├── PipelineBehaviors/
    │   ├── ValidationBehavior.ts
    │   └── LoggingBehavior.ts
    └── Middleware/
        └── TenantMiddleware.ts
```

## Key Changes

### 1. Result Pattern for Error Handling

All business operations now return a `Result<T>` type:

```typescript
const result = await handler.handle(request);

if (result.isFailure) {
  // Handle error
  console.error(result.error);
} else {
  // Use success value
  const data = result.value;
}
```

### 2. Feature-Based Organization

Each feature is self-contained with its own:
- Request/Response types
- Validator
- Handler
- Domain-specific logic

Example:
```typescript
// In Features/ExcelUpload/UploadExcel.ts
export class UploadExcelHandler {
  async handle(request: UploadExcelRequest): Promise<Result<UploadExcelResponse>> {
    // Implementation
  }
}
```

### 3. API Route Integration

API routes now use vertical slice handlers:

```typescript
// In app/api/files/upload/route.ts
import { UploadExcelHandler } from "@/Features/ExcelUpload/UploadExcel";

export async function POST(req: NextRequest) {
  const handler = new UploadExcelHandler();
  const result = await handler.handle({
    file: formData.get("file") as File,
    userId: session.user.id,
  });

  if (result.isFailure) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ data: result.value });
}
```

### 4. Business Errors

Defined in `Common/Errors.ts`:
```typescript
export const ExcelErrors = {
  InvalidFormat: { code: "Excel.InvalidFormat", message: "지원하지 않는 Excel 형식입니다" },
  EmptyFile: { code: "Excel.EmptyFile", message: "빈 파일은 처리할 수 없습니다" },
  // ... more errors
};
```

### 5. Testing Strategy

Focus on subcutaneous tests:
```typescript
describe("UploadExcel Feature", () => {
  it("should successfully upload a valid Excel file", async () => {
    const result = await handler.handle(request);
    expect(result.isSuccess).toBe(true);
    expect(result.value).toMatchObject({ /* expected */ });
  });
});
```

## Migration Guide

To migrate existing code:

1. **Identify the feature** - What business capability does this code serve?
2. **Create a vertical slice** - New folder under Features/
3. **Extract to handler** - Move logic into a handler class
4. **Add Result pattern** - Return Result<T> instead of throwing exceptions
5. **Update API routes** - Use the new handler
6. **Write tests** - Focus on integration tests for the entire slice

## Benefits

1. **Clear boundaries** - Each feature is self-contained
2. **Easy to understand** - All related code in one place
3. **Testable** - Each slice can be tested independently
4. **Scalable** - Add new features without affecting existing ones
5. **Maintainable** - Changes are localized to specific features

## Next Steps

1. Continue migrating remaining API routes
2. Implement missing features as new vertical slices
3. Add integration tests for each feature
4. Set up CI/CD pipeline with feature-based testing
5. Implement remaining infrastructure services (cloud storage, AI services)