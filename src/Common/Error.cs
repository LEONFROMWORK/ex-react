namespace ExcelApp.Common;

public class Error
{
    public string Code { get; }
    public string Message { get; }

    public Error(string code, string message)
    {
        Code = code;
        Message = message;
    }

    public static Error None => new(string.Empty, string.Empty);

    public static implicit operator string(Error error) => error.Message;

    public override string ToString() => $"{Code}: {Message}";
}

// Business errors for Excel operations
public static class ExcelErrors
{
    public static readonly Error InvalidFormat = new("Excel.InvalidFormat", 
        "지원하지 않는 Excel 형식입니다");
    
    public static readonly Error EmptyFile = new("Excel.EmptyFile", 
        "빈 파일은 처리할 수 없습니다");
    
    public static readonly Error TooLarge = new("Excel.TooLarge", 
        "파일 크기가 제한을 초과했습니다");
    
    public static readonly Error CorruptedFile = new("Excel.CorruptedFile",
        "손상된 파일입니다");
    
    public static readonly Error ProcessingFailed = new("Excel.ProcessingFailed",
        "파일 처리 중 오류가 발생했습니다");
    
    public static readonly Error AnalysisFailed = new("Excel.AnalysisFailed",
        "분석 중 오류가 발생했습니다");
}