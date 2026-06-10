import { RoleName } from '@/shared/constants/role.constant';
import { CurrentUser } from '@/shared/decorator/current-user.decorator';
import { Roles } from '@/shared/decorator/roles.decorator';
import { SuccessMessage } from '@/shared/decorator/success-message.decorator';
import { ApiError, ApiSuccess } from '@/shared/swagger/api-response.decorator';
import { AuthSwagger } from '@/shared/swagger/auth-swagger.decorator';
import type { ActiveUserData } from '@/shared/types/active-user.type';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import {
  CreateDepositRequestBodyDto,
  DepositRequestResDto,
  ListDepositRequestQueryDto,
  ListDepositRequestResDto,
  RejectDepositBodyDto,
} from './deposit.dto';
import { WalletRequestType } from './deposit.model';
import { DepositService } from './deposit.service';
import {
  ExchangeRateResDto,
  ListExchangeRateResDto,
  SetExchangeRateBodyDto,
} from './exchange-rate.dto';
import { ExchangeRateService } from './exchange-rate.service';
import {
  AccountLookupResDto,
  ListTransactionQueryDto,
  ListTransactionResDto,
  SetWalletCurrencyBodyDto,
  TransferBodyDto,
  TransferResDto,
  WalletInfoResDto,
} from './wallet.dto';
import { WalletService } from './wallet.service';

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly depositService: DepositService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  @Get()
  @AuthSwagger()
  @ApiOperation({ summary: 'Get my wallet info (account number + balance)' })
  @ApiSuccess(WalletInfoResDto, { description: 'OK' })
  @SuccessMessage('OK')
  @ZodSerializerDto(WalletInfoResDto)
  getWallet(@CurrentUser() user: ActiveUserData) {
    return this.walletService.getWalletInfo(user.userId);
  }

  @Get('transactions')
  @AuthSwagger()
  @ApiOperation({
    summary: 'Get my transaction history (cursor pagination, filter by type)',
  })
  @ApiSuccess(ListTransactionResDto, { description: 'OK' })
  @SuccessMessage('OK')
  @ZodSerializerDto(ListTransactionResDto)
  getTransactions(
    @CurrentUser() user: ActiveUserData,
    @Query() query: ListTransactionQueryDto,
  ) {
    return this.walletService.listTransactions(user.userId, query);
  }

  @Post('currency')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({ summary: 'Set wallet currency (VND/USD/GBP/JPY/KRW)' })
  @ApiSuccess(WalletInfoResDto, { description: 'Currency updated' })
  @SuccessMessage('Currency updated')
  @ZodSerializerDto(WalletInfoResDto)
  setCurrency(
    @CurrentUser() user: ActiveUserData,
    @Body() body: SetWalletCurrencyBodyDto,
  ) {
    return this.walletService.setCurrency(user.userId, body.currency);
  }

  @Get('exchange-rates')
  @AuthSwagger()
  @ApiOperation({ summary: 'List all exchange rates' })
  @ApiSuccess(ListExchangeRateResDto, { description: 'OK' })
  @SuccessMessage('OK')
  @ZodSerializerDto(ListExchangeRateResDto)
  listRates() {
    return this.exchangeRateService.list();
  }

  @Roles(RoleName.Admin)
  @Post('admin/exchange-rates')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({ summary: 'Set an exchange rate (admin)' })
  @ApiSuccess(ExchangeRateResDto, { description: 'Rate set' })
  @SuccessMessage('Exchange rate set')
  @ZodSerializerDto(ExchangeRateResDto)
  setRate(
    @CurrentUser() user: ActiveUserData,
    @Body() body: SetExchangeRateBodyDto,
  ) {
    return this.exchangeRateService.setRate(
      body.fromCurrency,
      body.toCurrency,
      body.rate,
      user.userId,
    );
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({
    summary: 'Transfer money to another account (internal, atomic)',
  })
  @ApiSuccess(TransferResDto, { description: 'Transfer successful' })
  @ApiError(
    409,
    'Insufficient balance / account not found',
    'Insufficient balance',
  )
  @SuccessMessage('Transfer successful')
  @ZodSerializerDto(TransferResDto)
  transfer(@CurrentUser() user: ActiveUserData, @Body() body: TransferBodyDto) {
    return this.walletService.transfer(
      user.userId,
      body.toAccountNumber,
      body.amount,
      body.description,
    );
  }

  @Get('accounts/:accountNumber')
  @AuthSwagger()
  @ApiOperation({
    summary: 'Lookup account holder name by account number (verify recipient)',
  })
  @ApiSuccess(AccountLookupResDto, { description: 'OK' })
  @ApiError(404, 'Account not found', 'Account not found')
  @SuccessMessage('OK')
  @ZodSerializerDto(AccountLookupResDto)
  lookupAccount(@Param('accountNumber') accountNumber: string) {
    return this.walletService.lookupAccount(accountNumber);
  }

  @Post('deposit-requests')
  @AuthSwagger()
  @ApiOperation({
    summary: 'Create a deposit request (PENDING — needs admin approval)',
  })
  @ApiSuccess(DepositRequestResDto, { description: 'Deposit request created' })
  @SuccessMessage('Deposit request created')
  @ZodSerializerDto(DepositRequestResDto)
  createDepositRequest(
    @CurrentUser() user: ActiveUserData,
    @Body() body: CreateDepositRequestBodyDto,
  ) {
    return this.depositService.createRequest(
      user.userId,
      WalletRequestType.DEPOSIT,
      body.currency,
      body.amount,
      body.note,
    );
  }

  @Post('withdraw-requests')
  @AuthSwagger()
  @ApiOperation({
    summary:
      'Create a withdraw request — holds (deducts) balance, needs admin approval',
  })
  @ApiSuccess(DepositRequestResDto, { description: 'Withdraw request created' })
  @ApiError(409, 'Insufficient balance', 'Insufficient balance')
  @SuccessMessage('Withdraw request created')
  @ZodSerializerDto(DepositRequestResDto)
  createWithdrawRequest(
    @CurrentUser() user: ActiveUserData,
    @Body() body: CreateDepositRequestBodyDto,
  ) {
    return this.depositService.createRequest(
      user.userId,
      WalletRequestType.WITHDRAW,
      body.currency,
      body.amount,
      body.note,
    );
  }

  @Get('deposit-requests')
  @AuthSwagger()
  @ApiOperation({ summary: 'List my deposit requests' })
  @ApiSuccess(ListDepositRequestResDto, { description: 'OK' })
  @SuccessMessage('OK')
  @ZodSerializerDto(ListDepositRequestResDto)
  listMyDepositRequests(
    @CurrentUser() user: ActiveUserData,
    @Query() query: ListDepositRequestQueryDto,
  ) {
    return this.depositService.list(query, user.userId);
  }

  @Delete('deposit-requests/:id')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({ summary: 'Cancel my pending deposit request' })
  @ApiSuccess(DepositRequestResDto, { description: 'Cancelled' })
  @ApiError(403, 'Not your request', 'Not your deposit request')
  @ApiError(409, 'Already processed', 'Deposit request already approved')
  @SuccessMessage('Deposit request cancelled')
  @ZodSerializerDto(DepositRequestResDto)
  cancelDepositRequest(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.depositService.cancel(id, user.userId);
  }

  @Roles(RoleName.Admin)
  @Get('admin/deposit-requests')
  @AuthSwagger()
  @ApiOperation({ summary: 'List all deposit requests (admin)' })
  @ApiSuccess(ListDepositRequestResDto, { description: 'OK' })
  @SuccessMessage('OK')
  @ZodSerializerDto(ListDepositRequestResDto)
  listAllDepositRequests(@Query() query: ListDepositRequestQueryDto) {
    return this.depositService.listAll(query);
  }

  @Roles(RoleName.Admin)
  @Post('admin/deposit-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({
    summary: 'Approve deposit request — credits user wallet (admin)',
  })
  @ApiSuccess(DepositRequestResDto, { description: 'Approved & credited' })
  @ApiError(404, 'Not found', 'Deposit request not found')
  @ApiError(409, 'Already processed', 'Deposit request already approved')
  @SuccessMessage('Deposit approved')
  @ZodSerializerDto(DepositRequestResDto)
  approveDeposit(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.depositService.approve(id, user.userId);
  }

  @Roles(RoleName.Admin)
  @Post('admin/deposit-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @AuthSwagger()
  @ApiOperation({ summary: 'Reject deposit request (admin)' })
  @ApiSuccess(DepositRequestResDto, { description: 'Rejected' })
  @ApiError(404, 'Not found', 'Deposit request not found')
  @ApiError(409, 'Already processed', 'Deposit request already approved')
  @SuccessMessage('Deposit rejected')
  @ZodSerializerDto(DepositRequestResDto)
  rejectDeposit(
    @CurrentUser() user: ActiveUserData,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RejectDepositBodyDto,
  ) {
    return this.depositService.reject(id, user.userId, body.rejectReason);
  }
}
