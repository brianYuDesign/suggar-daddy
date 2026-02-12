import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "@suggar-daddy/auth";
import { LoginDto, RegisterDto, RefreshTokenDto } from "@suggar-daddy/dto";
import { UserRole } from "@suggar-daddy/auth";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

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

  const mockJwtUser = {
    userId: "user-123",
    email: "test@example.com",
    role: UserRole.SUBSCRIBER,
  };

  const mockTokenResponse = {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    expiresIn: 3600,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const registerDto: RegisterDto = {
        email: "newuser@example.com",
        password: "Password123!",
        displayName: "New User",
        role: "sugar_daddy",
      };

      mockAuthService.register.mockResolvedValue(mockTokenResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(mockTokenResponse);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
    });

    it("should handle registration errors", async () => {
      const registerDto: RegisterDto = {
        email: "existing@example.com",
        password: "Password123!",
        displayName: "Existing User",
        role: "sugar_baby",
      };

      mockAuthService.register.mockRejectedValue(
        new Error("Email already exists"),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        "Email already exists",
      );
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe("login", () => {
    it("should login user with valid credentials", async () => {
      const loginDto: LoginDto = {
        email: "test@example.com",
        password: "Password123!",
      };

      mockAuthService.login.mockResolvedValue(mockTokenResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockTokenResponse);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it("should handle invalid credentials", async () => {
      const loginDto: LoginDto = {
        email: "test@example.com",
        password: "WrongPassword",
      };

      mockAuthService.login.mockRejectedValue(new Error("Invalid credentials"));

      await expect(controller.login(loginDto)).rejects.toThrow(
        "Invalid credentials",
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

      mockAuthService.logout.mockResolvedValue({ success: true });

      const result = await controller.logout(refreshDto);

      expect(result).toEqual({ success: true });
      expect(authService.logout).toHaveBeenCalledWith(refreshDto.refreshToken);
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
