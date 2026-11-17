import { Global, Logger, Module } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { AnthropicProvider } from './llm/anthropic.provider';
import { FakeLLMProvider } from './llm/fake.provider';
import { LLM_PROVIDER, type LLMProvider } from './llm/llm-provider';
import { SalesAgentService } from './sales-agent/sales-agent.service';

/** Chooses the LLM implementation from configuration. Nothing else in the app knows which one. */
@Global()
@Module({
  providers: [
    {
      provide: LLM_PROVIDER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): LLMProvider => {
        const logger = new Logger('AiModule');
        if (config.get('LLM_PROVIDER') === 'anthropic') {
          logger.log(`AI provider: Anthropic (${config.get('ANTHROPIC_MODEL')})`);
          return new AnthropicProvider({
            apiKey: config.get('ANTHROPIC_API_KEY')!,
            model: config.get('ANTHROPIC_MODEL'),
            baseUrl: config.get('ANTHROPIC_BASE_URL'),
            timeoutMs: config.get('LLM_TIMEOUT_MS'),
          });
        }
        if (!config.isTest)
          logger.warn(
            'AI provider: fake (offline demo replies). Set LLM_PROVIDER=anthropic for real AI.',
          );
        return new FakeLLMProvider();
      },
    },
    SalesAgentService,
  ],
  exports: [LLM_PROVIDER, SalesAgentService],
})
export class AiModule {}
