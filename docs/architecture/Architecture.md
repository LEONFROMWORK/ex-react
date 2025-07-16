#  Architecture 원칙
## 반드시 이 규칙을 지켜야함.

키텍처 설계 원칙: SOLID와 Vertical Slice Architecture의 실용적 융합
Excel 오류 수정 SaaS를 위한 10가지 핵심 아키텍처 원칙
1. Feature-First Single Responsibility (기능 우선 단일 책임)
원칙: 각 수직 슬라이스는 하나의 명확한 비즈니스 기능을 담당하며, 해당 기능에 필요한 모든 것을 포함한다. Without DebuggerGary Woodfine
구현 가이드라인:
csharp// ✅ Good: 하나의 기능에 필요한 모든 것을 포함
public static class AnalyzeExcelErrors
{
    public record Request(Stream ExcelFile, string AnalysisType);
    public record Response(List<ExcelError> Errors, string ReportId);
    
    public class Validator : AbstractValidator<Request> { }
    public class Handler : IRequestHandler<Request, Response> { }
    public class ExcelParser { } // 이 기능에만 필요한 파서
}

// ❌ Bad: 여러 책임이 혼재
public class ExcelService 
{
    public void ParseExcel() { }
    public void ValidateData() { }
    public void GenerateReport() { }
    public void SendEmail() { }
}
2. Pragmatic Abstraction (실용적 추상화)
원칙: 추상화는 실제 필요가 확인된 후에만 도입하며, 각 슬라이스가 자체적으로 결정한다. Jimmy BogardMedium
구현 가이드라인:
csharp// Phase 1: Transaction Script (처음엔 단순하게)
public class ProcessExcelFileHandler
{
    public async Task<Result> Handle(ProcessExcelFileRequest request)
    {
        var excelData = ExcelReader.Read(request.FilePath);
        var errors = ExcelValidator.Validate(excelData);
        await _dbContext.SaveAsync(errors);
        return Result.Success();
    }
}

// Phase 2: Domain Logic 추출 (복잡도 증가시)
public class ProcessExcelFileHandler
{
    public async Task<Result> Handle(ProcessExcelFileRequest request)
    {
        var excelFile = await ExcelFile.LoadAsync(request.FilePath);
        var analysisResult = excelFile.AnalyzeErrors(_errorDetectionRules);
        await _repository.SaveAnalysisAsync(analysisResult);
        return Result.Success();
    }
}
3. Controlled Duplication (통제된 중복)
원칙: 서로 다른 이유로 변경될 수 있는 코드는 중복을 허용하고, 진짜 행동 중복만 제거한다. Medium +4
구현 가이드라인:
csharp// ✅ Good: 다른 맥락의 유사한 코드는 분리 유지
namespace Features.ExcelUpload
{
    public class ExcelFileDto
    {
        public string FileName { get; set; }
        public long FileSize { get; set; }
        public DateTime UploadedAt { get; set; }
    }
}

namespace Features.ExcelAnalysis  
{
    public class ExcelFileInfo
    {
        public string FileName { get; set; }
        public int RowCount { get; set; }
        public int ColumnCount { get; set; }
        public List<string> SheetNames { get; set; }
    }
}

// Rule of Three: 세 번째 사용시 리팩토링 고려
4. Explicit Dependencies with Context (맥락적 명시적 의존성)
원칙: 각 슬라이스는 필요한 의존성을 명시적으로 선언하되, 슬라이스별 맥락에 맞게 구성한다. Alex-klaus +2
구현 가이드라인:
csharppublic static class ValidateExcelStructure
{
    public class Handler
    {
        // 이 기능에 필요한 의존성만 명시적으로 주입
        private readonly IExcelSchemaValidator _schemaValidator;
        private readonly IValidationRuleRepository _ruleRepository;
        private readonly ILogger<Handler> _logger;
        
        public Handler(
            IExcelSchemaValidator schemaValidator,
            IValidationRuleRepository ruleRepository,
            ILogger<Handler> logger)
        {
            _schemaValidator = schemaValidator;
            _ruleRepository = ruleRepository;
            _logger = logger;
        }
        
        public async Task<ValidationResult> Handle(Request request)
        {
            var rules = await _ruleRepository.GetRulesForTenant(request.TenantId);
            return await _schemaValidator.ValidateAsync(request.ExcelData, rules);
        }
    }
}
5. Result-Based Error Handling (결과 기반 오류 처리)
원칙: 비즈니스 오류는 Result 패턴으로, 시스템 오류는 예외로 처리하여 명확한 오류 흐름을 만든다. milanjovanovic +2
구현 가이드라인:
csharppublic class Result<T>
{
    public bool IsSuccess { get; }
    public T Value { get; }
    public Error Error { get; }
    
    public static Result<T> Success(T value) => new(true, value, null);
    public static Result<T> Failure(Error error) => new(false, default, error);
}

// 비즈니스 오류 정의
public static class ExcelErrors
{
    public static readonly Error InvalidFormat = new("Excel.InvalidFormat", 
        "지원하지 않는 Excel 형식입니다");
    public static readonly Error EmptyFile = new("Excel.EmptyFile", 
        "빈 파일은 처리할 수 없습니다");
    public static readonly Error TooLarge = new("Excel.TooLarge", 
        "파일 크기가 제한을 초과했습니다");
}

// 사용 예시
public async Task<Result<AnalysisReport>> AnalyzeExcel(Stream file)
{
    if (!IsValidExcelFormat(file))
        return Result<AnalysisReport>.Failure(ExcelErrors.InvalidFormat);
        
    // 정상 처리
    var report = await ProcessExcelFile(file);
    return Result<AnalysisReport>.Success(report);
}
6. Feature-Scoped External Dependencies (기능별 외부 의존성 관리)
원칙: 외부 서비스(AI API, 파일 저장소 등)는 기능별로 특화된 어댑터를 통해 관리한다. Zenduty +5
구현 가이드라인:
csharppublic static class AnalyzeWithAI
{
    // 이 기능에 특화된 AI 서비스 어댑터
    public class ExcelErrorAIAdapter
    {
        private readonly HttpClient _httpClient;
        private readonly ICircuitBreaker _circuitBreaker;
        private readonly ILogger<ExcelErrorAIAdapter> _logger;
        
        public async Task<AIAnalysisResult> AnalyzeErrorsAsync(ExcelData data)
        {
            return await _circuitBreaker.ExecuteAsync(async () =>
            {
                var prompt = BuildErrorAnalysisPrompt(data);
                var response = await CallOpenAIAPI(prompt);
                return ParseAIResponse(response);
            });
        }
        
        private string BuildErrorAnalysisPrompt(ExcelData data)
        {
            // 이 기능에 최적화된 프롬프트 생성
            return $"다음 Excel 데이터의 오류를 분석해주세요: {data.Summary}";
        }
    }
}
7. Vertical Testing Strategy (수직적 테스트 전략)
원칙: 각 슬라이스를 끝까지 테스트하는 통합 테스트를 우선시하고, 복잡한 비즈니스 로직만 단위 테스트한다. GitHub +7
구현 가이드라인:
csharp// Subcutaneous Test (피하 테스트)
[Test]
public async Task ProcessExcelFile_WithValidFile_ReturnsAnalysisReport()
{
    // Arrange
    var excelFile = TestDataBuilder.CreateValidExcelFile();
    var request = new ProcessExcelFileRequest 
    { 
        File = excelFile,
        TenantId = "test-tenant"
    };
    
    // Act
    var result = await _mediator.Send(request);
    
    // Assert
    result.IsSuccess.Should().BeTrue();
    result.Value.Errors.Should().HaveCount(3);
    result.Value.Errors.Should().Contain(e => e.Type == ErrorType.FormulaError);
}

// 복잡한 비즈니스 로직만 단위 테스트
[Test]
public void ExcelFormulaParser_ParseComplexFormula_ReturnsCorrectAST()
{
    var formula = "=IF(A1>10,SUM(B1:B10),AVERAGE(C1:C10))";
    var ast = ExcelFormulaParser.Parse(formula);
    ast.RootNode.Type.Should().Be(NodeType.If);
}
8. Pipeline-Based Cross-Cutting Concerns (파이프라인 기반 횡단 관심사)
원칙: 로깅, 검증, 캐싱 등의 횡단 관심사는 파이프라인 패턴으로 처리한다. Milan Jovanović +6
구현 가이드라인:
csharp// MediatR Pipeline Behavior
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;
    
    public async Task<TResponse> Handle(
        TRequest request, 
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        // 검증 실행
        var failures = _validators
            .Select(v => v.Validate(request))
            .SelectMany(result => result.Errors)
            .Where(f => f != null)
            .ToList();
            
        if (failures.Any())
            throw new ValidationException(failures);
            
        return await next();
    }
}

// 등록
services.AddScoped(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
services.AddScoped(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
services.AddScoped(typeof(IPipelineBehavior<,>), typeof(CachingBehavior<,>));
9. Tenant-Aware Architecture (테넌트 인식 아키텍처)
원칙: 멀티테넌시는 인프라 레벨에서 투명하게 처리하여 비즈니스 로직을 깨끗하게 유지한다. PermifyFrontegg
구현 가이드라인:
csharp// Tenant Context
public interface ITenantContext
{
    string CurrentTenantId { get; }
}

// Tenant-Aware Repository
public class TenantAwareRepository<T> where T : ITenantEntity
{
    private readonly DbContext _context;
    private readonly ITenantContext _tenantContext;
    
    public async Task<T> GetByIdAsync(int id)
    {
        return await _context.Set<T>()
            .Where(e => e.TenantId == _tenantContext.CurrentTenantId && e.Id == id)
            .FirstOrDefaultAsync();
    }
}

// 사용시 테넌트 격리가 자동으로 적용됨
public class GetExcelAnalysisHandler
{
    private readonly TenantAwareRepository<ExcelAnalysis> _repository;
    
    public async Task<ExcelAnalysis> Handle(GetExcelAnalysisRequest request)
    {
        // TenantId 필터링이 자동으로 적용됨
        return await _repository.GetByIdAsync(request.AnalysisId);
    }
}
10. Progressive Enhancement Architecture (점진적 개선 아키텍처)
원칙: 단순한 구조로 시작하여 실제 필요에 따라 점진적으로 복잡도를 추가한다. GitHub +7
구현 가이드라인:
csharp// Phase 1: Simple Transaction Script
public class UploadExcelHandler
{
    public async Task<Result> Handle(UploadExcelRequest request)
    {
        var errors = BasicExcelValidator.Validate(request.File);
        await _dbContext.ExcelUploads.AddAsync(new ExcelUpload 
        { 
            Errors = errors 
        });
        return Result.Success();
    }
}

// Phase 2: Domain Logic 추가 (필요시)
public class UploadExcelHandler
{
    public async Task<Result> Handle(UploadExcelRequest request)
    {
        var excelFile = ExcelFile.Create(request.File);
        var validation = await excelFile.ValidateAsync(_validationRules);
        
        if (validation.HasCriticalErrors)
            return Result.Failure(validation.Errors);
            
        await _repository.SaveAsync(excelFile);
        await _eventBus.PublishAsync(new ExcelUploadedEvent(excelFile.Id));
        
        return Result.Success();
    }
}
폴더 구조 예시
src/
├── Features/                      # 모든 기능은 여기에
│   ├── ExcelUpload/
│   │   ├── UploadExcel.cs       # Request, Response, Handler, Validator
│   │   ├── ExcelFileValidator.cs # 이 기능에만 필요한 검증 로직
│   │   └── UploadExcel.Tests.cs # 기능별 테스트
│   ├── ExcelAnalysis/
│   │   ├── AnalyzeErrors/
│   │   │   ├── AnalyzeErrors.cs
│   │   │   ├── ErrorDetectionRules.cs
│   │   │   └── AIErrorAnalyzer.cs
│   │   └── GenerateReport/
│   │       └── GenerateErrorReport.cs
│   └── ExcelCorrection/
│       ├── ApplyCorrections.cs
│       └── CorrectionStrategies/
├── Common/                        # 진짜 공통 요소만
│   ├── Result.cs
│   ├── Error.cs
│   └── Extensions/
├── Infrastructure/                # 인프라 구현
│   ├── Persistence/
│   │   ├── AppDbContext.cs
│   │   └── Migrations/
│   ├── ExternalServices/
│   │   ├── OpenAIClient.cs
│   │   └── AzureBlobStorage.cs
│   └── BackgroundJobs/
└── Host/                         # 앱 진입점
    ├── Program.cs
    ├── PipelineBehaviors/
    └── Middleware/
1인 개발자를 위한 실용적 체크리스트
프로젝트 시작 단계

 Vertical Slice Architecture 템플릿으로 시작 Verticalslicearchitecture +2
 최소한의 기능 하나를 완전히 구현 (Upload Excel) InfoQ
 Result 패턴과 기본 에러 처리 설정
 단순한 폴더 구조로 시작 (Features, Common, Infrastructure)
 CI/CD 파이프라인 설정 (GitHub Actions + Azure/AWS) medium

기능 개발 단계

 새 기능은 항상 새로운 슬라이스로 시작 Jimmy Bogard
 Transaction Script로 시작, 복잡해지면 리팩토링 Jimmy Bogard
 세 번째 사용 전까지는 중복 허용 martinfowler
 각 슬라이스에 통합 테스트 작성
 외부 API는 Circuit Breaker와 함께 사용 Microsoft LearnGeeksforGeeks

코드 품질 관리

 매주 금요일 오후는 리팩토링 시간으로 확보 Medium
 기술 부채 로그 유지 (TODO 주석 + GitHub Issues) Medium
 2주마다 아키텍처 결정 재검토
 성능 문제가 실제로 발생하면 최적화

배포 및 운영

 Feature Flag로 새 기능 점진적 출시
 기본적인 로깅과 모니터링 설정 (Application Insights)
 테넌트별 사용량 추적
 주간 백업 및 복구 테스트

피해야 할 안티패턴

 ❌ 모든 것에 인터페이스 만들기 ProFocus TechnologyMadAppGang
 ❌ 미래를 위한 추상화 Martin Fowlermartinfowler
 ❌ 복잡한 상속 계층 구조
 ❌ 과도한 DRY 추구 Entropy Wins
 ❌ 엔터프라이즈 패턴 맹목적 적용 LinkedInMedium

이 아키텍처 원칙들은 1인 개발자가 Excel 오류 수정 SaaS를 효율적으로 개발하면서도 장기적인 유지보수성을 확보할 수 있도록 설계되었습니다. Medium +5 핵심은 단순하게 시작하되, 실제 필요에 따라 점진적으로 발전시키는 것입니다. Milan Jovanović +5
