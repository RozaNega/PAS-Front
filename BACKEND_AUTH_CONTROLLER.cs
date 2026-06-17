using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Persistence.Identity;
using Application.Common.Interfaces;
using Application.Common.Models;
using System.IdentityModel.Tokens.Jwt;

namespace PAS.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly IConfiguration _configuration;
        private readonly JwtSettings _jwtSettings;
        private readonly IEmailService _emailService;
        private readonly IFileStorageService _fileStorageService;
        private readonly ICurrentUserService _currentUserService;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            RoleManager<ApplicationRole> roleManager,
            IConfiguration configuration,
            IOptions<JwtSettings> jwtSettings,
            IEmailService emailService,
            IFileStorageService fileStorageService,
            ICurrentUserService currentUserService)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _roleManager = roleManager;
            _configuration = configuration;
            _jwtSettings = jwtSettings.Value;
            _emailService = emailService;
            _fileStorageService = fileStorageService;
            _currentUserService = currentUserService;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _userManager.FindByNameAsync(request.Username)
                       ?? await _userManager.FindByEmailAsync(request.Username);

            if (user == null)
                return Unauthorized(new { success = false, message = "Invalid username or password." });

            if (!user.IsActive)
                return Unauthorized(new { success = false, message = "Account is not active. Please contact an administrator." });

            var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, true);
            if (result.IsLockedOut)
                return Unauthorized(new { success = false, message = "Account is locked. Please try again later." });

            if (!result.Succeeded)
                return Unauthorized(new { success = false, message = "Invalid username or password." });

            var token = await GenerateJwtToken(user);
            var refreshToken = GenerateRefreshToken();

            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
            await _userManager.UpdateAsync(user);

            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new
            {
                success = true,
                message = "Login successful.",
                data = new
                {
                    token,
                    refreshToken,
                    expiresAt = DateTime.UtcNow.AddHours(8),
                    user = new
                    {
                        id = user.Id,
                        username = user.UserName,
                        fullName = user.FullName,
                        email = user.Email,
                        roles,
                        isActive = user.IsActive
                    }
                }
            });
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (await _userManager.FindByNameAsync(request.Username) != null)
                return BadRequest(new { success = false, message = "Username already taken." });

            if (await _userManager.FindByEmailAsync(request.Email) != null)
                return BadRequest(new { success = false, message = "Email already registered." });

            var user = new ApplicationUser
            {
                UserName = request.Username,
                Email = request.Email,
                FullName = request.FullName ?? request.Username,
                PhoneNumber = request.Phone,
                IsActive = true,
                EmailConfirmed = false,
                CreatedAt = DateTime.UtcNow
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
                return BadRequest(new
                {
                    success = false,
                    message = "Registration failed.",
                    errors = result.Errors.Select(e => e.Description)
                });

            var roleName = request.RoleName ?? "Employee";
            if (!await _roleManager.RoleExistsAsync(roleName))
                await _roleManager.CreateAsync(new ApplicationRole(roleName));

            await _userManager.AddToRoleAsync(user, roleName);

            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            var confirmationLink = Url.Action(nameof(ConfirmEmail), "Auth",
                new { token, email = user.Email }, Request.Scheme);

            try
            {
                await _emailService.SendEmailAsync(user.Email, "Confirm your email",
                    $"Please confirm your account by clicking <a href='{confirmationLink}'>here</a>.");
            }
            catch
            {
                // Email sending is non-critical during registration
            }

            return Ok(new
            {
                success = true,
                message = "Registration successful. Please check your email to confirm your account.",
                data = new { userId = user.Id }
            });
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            var userId = _currentUserService.UserId;
            if (!string.IsNullOrEmpty(userId))
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user != null)
                {
                    user.RefreshToken = null;
                    user.RefreshTokenExpiryTime = null;
                    await _userManager.UpdateAsync(user);
                }
            }

            await _signInManager.SignOutAsync();
            return Ok(new { success = true, message = "Logged out successfully." });
        }

        [HttpPost("refresh-token")]
        [AllowAnonymous]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            var principal = GetPrincipalFromExpiredToken(request.Token);
            if (principal == null)
                return Unauthorized(new { success = false, message = "Invalid token." });

            var username = principal.Identity?.Name;
            var user = await _userManager.FindByNameAsync(username);

            if (user == null || user.RefreshToken != request.RefreshToken
                            || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
                return Unauthorized(new { success = false, message = "Invalid or expired refresh token." });

            var newToken = await GenerateJwtToken(user);
            var newRefreshToken = GenerateRefreshToken();

            user.RefreshToken = newRefreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
            await _userManager.UpdateAsync(user);

            return Ok(new
            {
                success = true,
                message = "Token refreshed.",
                data = new { token = newToken, refreshToken = newRefreshToken }
            });
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userId = _currentUserService.UserId;
            var user = await _userManager.FindByIdAsync(userId);

            if (user == null)
                return NotFound(new { success = false, message = "User not found." });

            var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            if (!result.Succeeded)
                return BadRequest(new
                {
                    success = false,
                    message = "Password change failed.",
                    errors = result.Errors.Select(e => e.Description)
                });

            return Ok(new { success = true, message = "Password changed successfully." });
        }

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
                return Ok(new { success = true, message = "If the email exists, a reset link has been sent." });

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);

            try
            {
                await _emailService.SendEmailAsync(user.Email, "Password Reset",
                    $"Your password reset token is: {token}");
            }
            catch
            {
                return Ok(new { success = true, message = "If the email exists, a reset link has been sent." });
            }

            return Ok(new
            {
                success = true,
                message = "If the email exists, a reset link has been sent.",
                data = new { token }
            });
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
                return BadRequest(new { success = false, message = "Invalid request." });

            var result = await _userManager.ResetPasswordAsync(user, request.Token, request.Password);
            if (!result.Succeeded)
                return BadRequest(new
                {
                    success = false,
                    message = "Password reset failed.",
                    errors = result.Errors.Select(e => e.Description)
                });

            return Ok(new { success = true, message = "Password reset successfully." });
        }

        [HttpPost("upload-profile-photo")]
        [Authorize]
        public async Task<IActionResult> UploadProfilePhoto(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "No file provided." });

            var userId = _currentUserService.UserId;
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound(new { success = false, message = "User not found." });

            var url = await _fileStorageService.SaveFileAsync(file, $"users/{userId}/photos");
            user.ProfilePhotoUrl = url;
            await _userManager.UpdateAsync(user);

            return Ok(new
            {
                success = true,
                message = "Profile photo uploaded.",
                data = new { photoUrl = url }
            });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = _currentUserService.UserId;
            var user = await _userManager.FindByIdAsync(userId);

            if (user == null)
                return NotFound(new { success = false, message = "User not found." });

            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new
            {
                success = true,
                data = new
                {
                    id = user.Id,
                    username = user.UserName,
                    fullName = user.FullName,
                    email = user.Email,
                    phoneNumber = user.PhoneNumber,
                    roles,
                    isActive = user.IsActive,
                    emailConfirmed = user.EmailConfirmed,
                    twoFactorEnabled = user.TwoFactorEnabled,
                    profilePhotoUrl = user.ProfilePhotoUrl,
                    createdAt = user.CreatedAt
                }
            });
        }

        // --- Helpers ---

        private async Task<string> GenerateJwtToken(ApplicationUser user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id),
                new(ClaimTypes.Name, user.UserName),
                new(ClaimTypes.Email, user.Email ?? ""),
                new("fullName", user.FullName ?? "")
            };

            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_jwtSettings.Key ?? _configuration["Jwt:Key"] ?? "DefaultSecretKey123!"));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static string GenerateRefreshToken()
        {
            var randomBytes = new byte[64];
            using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }

        private ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
        {
            var key = _configuration["Jwt:Key"] ?? "DefaultSecretKey123!";
            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = false,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            try
            {
                var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out var securityToken);
                if (securityToken is not JwtSecurityToken jwtToken
                    || !jwtToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                    return null;

                return principal;
            }
            catch
            {
                return null;
            }
        }
    }

    // --- Request DTOs ---

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string? RoleName { get; set; }
        public string? Phone { get; set; }
    }

    public class RefreshTokenRequest
    {
        public string Token { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    // --- Users Controller ---

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ICurrentUserService _currentUserService;

        public UsersController(
            UserManager<ApplicationUser> userManager,
            ICurrentUserService currentUserService)
        {
            _userManager = userManager;
            _currentUserService = currentUserService;
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { success = false, message = "User not found." });

            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new
            {
                success = true,
                data = new
                {
                    id = user.Id,
                    username = user.UserName,
                    fullName = user.FullName,
                    email = user.Email,
                    phoneNumber = user.PhoneNumber,
                    department = user.Department,
                    position = user.Position,
                    employeeCode = user.EmployeeCode,
                    roles,
                    isActive = user.IsActive,
                    profilePhotoUrl = user.ProfilePhotoUrl
                }
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
                return NotFound(new { success = false, message = "User not found." });

            if (!string.IsNullOrEmpty(request.FullName))
                user.FullName = request.FullName;

            if (!string.IsNullOrEmpty(request.Username))
                user.UserName = request.Username;

            if (!string.IsNullOrEmpty(request.Department))
                user.Department = request.Department;

            if (!string.IsNullOrEmpty(request.Position))
                user.Position = request.Position;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
                return BadRequest(new
                {
                    success = false,
                    message = "Failed to update profile.",
                    errors = result.Errors.Select(e => e.Description)
                });

            return Ok(new { success = true, message = "Profile updated successfully." });
        }
    }

    public class UpdateUserRequest
    {
        public string? Id { get; set; }
        public string? FullName { get; set; }
        public string? Name { get; set; }
        public string? Username { get; set; }
        public string? Department { get; set; }
        public string? Position { get; set; }
        public string? EmployeeCode { get; set; }
    }
}
