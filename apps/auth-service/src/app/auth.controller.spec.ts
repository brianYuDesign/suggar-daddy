import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard, OAuthService } from "@suggar-daddy/auth";
import { LoginDto, RegisterDto, RefreshTokenDto } from "@suggar-daddy/dto";
import { UserType, PermissionRole } from "@suggar-daddy/common";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let oauthService: jest.Mocked<OAuthService>;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    verifyEmail: jest.fn(),
    createEmailVerificationToken: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    deleteUser: jest.fn(),
  };

  const mockOAuthService = {
    handleOAuthLogin: jest.fn(),
  };

  const mockJwtUser = {
    userId: "user-123",
    email: "test@example.com",
    role: PermissionRole.SUBSCRIBER,
    jti: "jti-123",
  };

  const mockTokenResponse = {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    tokenType: "Bearer",
    expiresIn: 900,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: OAuthService,
          useValue: mockOAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    oauthService = module.get(OAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /register", () => {
    const validRegisterDto: RegisterDto = {
      email: "newuser@example.com",
      password: "Password123!",
      displayName: "New User",
      userType: UserType.SUGAR_DADDY,
    };

    it("should register user successfully when valid data provided", async () => {
      mockAuthService.register.mockResolvedValue(mockTokenResponse);

      const result = await controller.register(validRegisterDto);

      expect(result).toEqual(mockTokenResponse);
      expect(authService.register).toHaveBeenCalledWith(validRegisterDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
    });

    it("should return token response with correct structure when registration succeeds", async () => {
      mockAuthService.register.mockResolvedValue(mockTokenResponse);

      const result = await controller.register(validRegisterDto);

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("tokenType", "Bearer");
      expect(result).toHaveProperty("expiresIn");
    });

    it("should throw ConflictException when email already exists", async () => {
      const existingEmailDto = { ...validRegisterDto, email: "existing@example.com" };
      mockAuthService.register.mockRejectedValue(
        new ConflictException("Email already registered")
      );

      await expect(controller.register(existingEmailDto)).rejects.toThrow(ConflictException);
      expect(authService.register).toHaveBeenCalledWith(existingEmailDto);
    });

    it("should throw BadRequestException when email format is invalid", async () => {
      const invalidEmailDto = { ...validRegisterDto, email: "not-an-email" };
      mockAuthService.register.mockRejectedValue(
        new BadRequestException("Invalid email format")
      );

      await expect(controller.register(invalidEmailDto)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when password is too weak", async () => {
      const weakPasswordDto = { ...validRegisterDto, password: "weak" };
      mockAuthService.register.mockRejectedValue(
        new BadRequestException("Password must be at least 8 characters")
      );

      await expect(controller.register(weakPasswordDto)).rejects.toThrow(BadRequestException);
    });

    it("should call authService.register with all DTO fields", async () => {
      mockAuthService.register.mockResolvedValue(mockTokenResponse);

      await controller.register(validRegisterDto);

      expect(authService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validRegisterDto.email,
          password: validRegisterDto.password,
          displayName: validRegisterDto.displayName,
          userType: validRegisterDto.userType,
        })
      );
    });
  });

  describe("POST /login", () => {
    const validLoginDto: LoginDto = {
      email: "test@example.com",
      password: "Password123!",
    };

    it("should login user successfully when credentials are valid", async () => {
      mockAuthService.login.mockResolvedValue(mockTokenResponse);

      const result = await controller.login(validLoginDto);

      expect(result).toEqual(mockTokenResponse);
      expect(authService.login).toHaveBeenCalledWith(validLoginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it("should return token response with correct structure when login succeeds", async () => {
      mockAuthService.login.mockResolvedValue(mockTokenResponse);

      const result = await controller.login(validLoginDto);

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("tokenType", "Bearer");
      expect(result).toHaveProperty("expiresIn");
    });

    it("should throw UnauthorizedException when credentials are invalid", async () => {
      const invalidLoginDto = { ...validLoginDto, password: "WrongPassword" };
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException("Invalid email or password")
      );

      await expect(controller.login(invalidLoginDto)).rejects.toThrow(UnauthorizedException);
      expect(authService.login).toHaveBeenCalledWith(invalidLoginDto);
    });

    it("should throw UnauthorizedException when user does not exist", async () => {
      const nonExistentDto = { email: "nonexistent@example.com", password: "Password123!" };
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException("Invalid email or password")
      );

      await expect(controller.login(nonExistentDto)).rejects.toThrow(UnauthorizedException);
    });

    it("should call authService.login with provided credentials", async () => {
      mockAuthService.login.mockResolvedValue(mockTokenResponse);

      await controller.login(validLoginDto);

      expect(authService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validLoginDto.email,
          password: validLoginDto.password,
        })
      );
    });
  });

  describe("refresh", () => {
    it("should refresh access token with valid refresh token", async () => {
      const refreshDto: RefreshTokenDto = {
        refreshToken: "valid-refresh-token",
      };

      mockAuthService.refresh.mockResolvedValue(mockTokenResponse);

      const result = await controller.refresh(refreshDto);

      expect(result).toEqual(mockTokenResponse);
      expect(authService.refresh).toHaveBeenCalledWith(refreshDto.refreshToken);
    });

    it("should handle invalid refresh token", async () => {
      const refreshDto: RefreshTokenDto = {
        refreshToken: "invalid-refresh-token",
      };

      mockAuthService.refresh.mockRejectedValue(
        new Error("Invalid refresh token"),
      );

      await expect(controller.refresh(refreshDto)).rejects.toThrow(
        "Invalid refresh token",
      );
    });
  });

  describe("logout", () => {
    it("should logout user successfully", async () => {
      const refreshDto: RefreshTokenDto = {
        refreshToken: "valid-refresh-token",
      };
      const mockUser = { userId: 'user-123', email: 'test@example.com', role: 'subscriber', jti: 'jti-123' };

      mockAuthService.logout.mockResolvedValue({ success: true });

      const result = await controller.logout(refreshDto, mockUser);

      expect(result).toEqual({ success: true });
      expect(authService.logout).toHaveBeenCalledWith(refreshDto.refreshToken, mockUser.jti);
    });
  });

  describe("me", () => {
    it("should return current user info", () => {
      const result = controller.me(mockJwtUser);

      expect(result).toEqual(mockJwtUser);
    });
  });

  describe("verifyEmail", () => {
    it("should verify email with valid token", async () => {
      const token = "valid-email-token";
      mockAuthService.verifyEmail.mockResolvedValue({ success: true });

      const result = await controller.verifyEmail(token);

      expect(result).toEqual({ success: true });
      expect(authService.verifyEmail).toHaveBeenCalledWith(token);
    });

    it("should handle invalid email verification token", async () => {
      const token = "invalid-token";
      mockAuthService.verifyEmail.mockRejectedValue(
        new Error("Invalid or expired token"),
      );

      await expect(controller.verifyEmail(token)).rejects.toThrow(
        "Invalid or expired token",
      );
    });
  });

  describe("resendVerification", () => {
    it("should resend verification email", async () => {
      mockAuthService.createEmailVerificationToken.mockResolvedValue({
        success: true,
      });

      const result = await controller.resendVerification(mockJwtUser);

      expect(result).toEqual({ success: true });
      expect(authService.createEmailVerificationToken).toHaveBeenCalledWith(
        mockJwtUser.userId,
        mockJwtUser.email,
      );
    });
  });

  describe("forgotPassword", () => {
    it("should request password reset", async () => {
      const body = { email: "test@example.com" };
      mockAuthService.requestPasswordReset.mockResolvedValue({ success: true });

      const result = await controller.forgotPassword(body);

      expect(result).toEqual({ success: true });
      expect(authService.requestPasswordReset).toHaveBeenCalledWith(body.email);
    });
  });

  describe("resetPassword", () => {
    it("should reset password with valid token", async () => {
      const body = { token: "valid-reset-token", newPassword: "NewPass123!" };
      mockAuthService.resetPassword.mockResolvedValue({ success: true });

      const result = await controller.resetPassword(body);

      expect(result).toEqual({ success: true });
      expect(authService.resetPassword).toHaveBeenCalledWith(
        body.token,
        body.newPassword,
      );
    });
  });

  describe("changePassword", () => {
    it("should change password for authenticated user", async () => {
      const body = {
        oldPassword: "OldPass123!",
        newPassword: "NewPass123!",
      };
      mockAuthService.changePassword.mockResolvedValue({ success: true });

      const result = await controller.changePassword(mockJwtUser, body);

      expect(result).toEqual({ success: true });
      expect(authService.changePassword).toHaveBeenCalledWith(
        mockJwtUser.userId,
        body.oldPassword,
        body.newPassword,
      );
    });

    it("should handle incorrect old password", async () => {
      const body = {
        oldPassword: "WrongOldPass",
        newPassword: "NewPass123!",
      };
      mockAuthService.changePassword.mockRejectedValue(
        new Error("Current password is incorrect"),
      );

      await expect(
        controller.changePassword(mockJwtUser, body),
      ).rejects.toThrow("Current password is incorrect");
    });
  });
});
