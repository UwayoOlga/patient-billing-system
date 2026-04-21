using System.Net;
using System.Text.Json;

namespace HospitalBilling.Middleware
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger, IHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, ex.Message);
                context.Response.ContentType = "application/json";
                
                var statusCode = HttpStatusCode.InternalServerError;
                var message = "An internal server error occurred. Please try again later.";

                // Customize status codes for specific exception types
                if (ex is InvalidOperationException || ex is ArgumentException)
                {
                    statusCode = HttpStatusCode.BadRequest;
                    message = ex.Message;
                }
                else if (ex is KeyNotFoundException)
                {
                    statusCode = HttpStatusCode.NotFound;
                    message = ex.Message;
                }
                else if (ex is UnauthorizedAccessException)
                {
                    statusCode = HttpStatusCode.Unauthorized;
                    message = "You are not authorized to perform this action.";
                }

                context.Response.StatusCode = (int)statusCode;

                var response = _env.IsDevelopment()
                    ? new ApiException((int)statusCode, ex.Message, ex.StackTrace?.ToString())
                    : new ApiException((int)statusCode, message);

                var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
                var json = JsonSerializer.Serialize(response, options);

                await context.Response.WriteAsync(json);
            }
        }
    }

    public class ApiException
    {
        public ApiException(int statusCode, string message, string? details = null)
        {
            StatusCode = statusCode;
            Message = message;
            Details = details;
        }

        public int StatusCode { get; set; }
        public string Message { get; set; }
        public string? Details { get; set; }
    }
}
