using ExcelApp.Common;
using FluentValidation;
using MediatR;

namespace ExcelApp.Features.ExcelUpload;

public static class UploadExcel
{
    // Request
    public record Request(
        Stream ExcelFile,
        string FileName,
        string ContentType,
        long FileSize,
        string UserId
    ) : IRequest<Result<Response>>;

    // Response
    public record Response(
        string FileId,
        string FileName,
        long FileSize,
        string Status,
        DateTime UploadedAt
    );

    // Validator
    public class Validator : AbstractValidator<Request>
    {
        private static readonly string[] ValidContentTypes = 
        {
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv"
        };

        private const long MaxFileSize = 50 * 1024 * 1024; // 50MB

        public Validator()
        {
            RuleFor(x => x.FileName)
                .NotEmpty().WithMessage("파일명이 필요합니다.");

            RuleFor(x => x.ContentType)
                .Must(ct => ValidContentTypes.Contains(ct))
                .WithMessage("지원하지 않는 파일 형식입니다.");

            RuleFor(x => x.FileSize)
                .LessThanOrEqualTo(MaxFileSize)
                .WithMessage("파일 크기는 50MB를 초과할 수 없습니다.");

            RuleFor(x => x.ExcelFile)
                .NotNull().WithMessage("파일이 필요합니다.")
                .Must(stream => stream.CanRead)
                .WithMessage("파일을 읽을 수 없습니다.");

            RuleFor(x => x.UserId)
                .NotEmpty().WithMessage("사용자 ID가 필요합니다.");
        }
    }

    // Handler
    public class Handler : IRequestHandler<Request, Result<Response>>
    {
        private readonly IFileStorage _fileStorage;
        private readonly IFileRepository _fileRepository;
        private readonly ILogger<Handler> _logger;

        public Handler(
            IFileStorage fileStorage,
            IFileRepository fileRepository,
            ILogger<Handler> logger)
        {
            _fileStorage = fileStorage;
            _fileRepository = fileRepository;
            _logger = logger;
        }

        public async Task<Result<Response>> Handle(Request request, CancellationToken cancellationToken)
        {
            try
            {
                // Generate unique file identifier
                var fileId = Guid.NewGuid().ToString();
                var fileExtension = Path.GetExtension(request.FileName);
                var storedFileName = $"{fileId}{fileExtension}";

                // Upload file to storage
                var uploadResult = await _fileStorage.UploadAsync(
                    request.ExcelFile, 
                    storedFileName,
                    cancellationToken);

                if (!uploadResult.IsSuccess)
                {
                    _logger.LogError("Failed to upload file: {Error}", uploadResult.Error);
                    return Result.Failure<Response>(ExcelErrors.ProcessingFailed);
                }

                // Save file metadata to database
                var fileEntity = new FileEntity
                {
                    Id = fileId,
                    UserId = request.UserId,
                    FileName = storedFileName,
                    OriginalName = request.FileName,
                    FileSize = request.FileSize,
                    MimeType = request.ContentType,
                    UploadUrl = uploadResult.Value,
                    Status = FileStatus.Pending,
                    UploadedAt = DateTime.UtcNow
                };

                await _fileRepository.AddAsync(fileEntity, cancellationToken);

                var response = new Response(
                    fileEntity.Id,
                    fileEntity.OriginalName,
                    fileEntity.FileSize,
                    fileEntity.Status.ToString(),
                    fileEntity.UploadedAt
                );

                _logger.LogInformation(
                    "File uploaded successfully: {FileId} for user {UserId}", 
                    fileId, 
                    request.UserId);

                return Result.Success(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during file upload");
                return Result.Failure<Response>(ExcelErrors.ProcessingFailed);
            }
        }
    }

    // Domain-specific interfaces (will be implemented in Infrastructure)
    public interface IFileStorage
    {
        Task<Result<string>> UploadAsync(Stream file, string fileName, CancellationToken cancellationToken);
    }

    public interface IFileRepository
    {
        Task AddAsync(FileEntity entity, CancellationToken cancellationToken);
    }

    // Domain entity
    public class FileEntity
    {
        public string Id { get; set; }
        public string UserId { get; set; }
        public string FileName { get; set; }
        public string OriginalName { get; set; }
        public long FileSize { get; set; }
        public string MimeType { get; set; }
        public string UploadUrl { get; set; }
        public FileStatus Status { get; set; }
        public DateTime UploadedAt { get; set; }
    }

    public enum FileStatus
    {
        Pending,
        Processing,
        Completed,
        Failed
    }
}