import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { VerifyRegistrationOtpDto } from './dto/verify-registration-otp.dto';


@Controller('auth')
export class AuthController {
    constructor(private auth: AuthService) {}

    @Post("register")
    register(@Body() dto: RegisterDto) {
        return this.auth.register(dto);
    }

    @Post('verify-otp')
    verifyRegistrationOtp(@Body() dto: VerifyRegistrationOtpDto) {
        return this.auth.verifyRegistrationOtp(dto);
    }

   @Post("login")
   login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get("me")
    me(@Req() req: any) {
        return this.auth.me(req.user.userId);
    }
}
