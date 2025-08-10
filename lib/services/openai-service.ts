/**
 * OpenAI Service Helper
 * 
 * Centralized service for OpenAI API interactions including document analysis,
 * text processing, and AI-powered features for the VVG template.
 */

import OpenAI from 'openai';
import { Logger } from './logger';

/**
 * OpenAI configuration interface
 */
interface OpenAIConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Document analysis result
 */
export interface DocumentAnalysisResult {
  summary: string;
  keyPoints: string[];
  categories: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

/**
 * Text comparison result
 */
export interface TextComparisonResult {
  similarity: number;
  differences: string[];
  commonPoints: string[];
  recommendations: string[];
}

/**
 * OpenAI Service class
 */
export class OpenAIService {
  private client: OpenAI;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || 'gpt-4-turbo-preview',
      maxTokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.3,
      ...config
    };

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });

    Logger.openai.start(`Initialized with model: ${this.config.model || 'gpt-4-turbo-preview'}`);
  }

  /**
   * Analyze document content using OpenAI
   */
  async analyzeDocument(content: string, filename?: string): Promise<DocumentAnalysisResult> {
    try {
      Logger.openai.start('Document analysis started');
      Logger.openai.request({ filename, contentLength: content.length });

      const prompt = `Analyze the following document content and provide:
1. A concise summary (2-3 sentences)
2. Key points (3-5 bullet points)
3. Categories that best describe this document
4. Overall sentiment (positive/neutral/negative)
5. Confidence level (0-1)

Document content:
${content.substring(0, 4000)}${content.length > 4000 ? '...' : ''}

Respond in JSON format with keys: summary, keyPoints, categories, sentiment, confidence`;

      const response = await this.client.chat.completions.create({
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: 'You are a document analysis expert. Provide accurate, concise analysis in the requested JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      const analysis = JSON.parse(result) as DocumentAnalysisResult;
      
      Logger.openai.success('Document analysis completed');

      return analysis;

    } catch (error) {
      Logger.openai.error('Document analysis failed', error as Error);
      throw error;
    }
  }

  /**
   * Compare two text documents
   */
  async compareDocuments(content1: string, content2: string, filename1?: string, filename2?: string): Promise<TextComparisonResult> {
    try {
      Logger.openai.start('Document comparison started');
      Logger.openai.request({ filename1, filename2 });

      const prompt = `Compare these two documents and provide:
1. Similarity score (0-1, where 1 is identical)
2. Key differences (list of differences)
3. Common points (shared elements)
4. Recommendations for alignment or improvement

Document 1:
${content1.substring(0, 2000)}${content1.length > 2000 ? '...' : ''}

Document 2:
${content2.substring(0, 2000)}${content2.length > 2000 ? '...' : ''}

Respond in JSON format with keys: similarity, differences, commonPoints, recommendations`;

      const response = await this.client.chat.completions.create({
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: 'You are a document comparison expert. Provide detailed comparison analysis in the requested JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      const comparison = JSON.parse(result) as TextComparisonResult;
      
      Logger.openai.success('Document comparison completed');

      return comparison;

    } catch (error) {
      Logger.openai.error('Document comparison failed', error as Error);
      throw error;
    }
  }

  /**
   * Generate summary for multiple documents
   */
  async generateSummary(contents: string[], filenames?: string[]): Promise<string> {
    try {
      Logger.openai.start('Summary generation started');
      Logger.openai.request({ documentCount: contents.length });

      const combinedContent = contents.map((content, index) => 
        `Document ${index + 1}${filenames?.[index] ? ` (${filenames[index]})` : ''}:\n${content.substring(0, 1500)}${content.length > 1500 ? '...' : ''}`
      ).join('\n\n---\n\n');

      const prompt = `Create a comprehensive summary of the following documents:

${combinedContent}

Provide a clear, structured summary that:
1. Highlights the main themes across all documents
2. Identifies common patterns or discrepancies
3. Provides actionable insights
4. Uses clear, professional language`;

      const response = await this.client.chat.completions.create({
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: 'You are a professional document summarization expert. Create clear, actionable summaries.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      const summary = response.choices[0]?.message?.content;
      if (!summary) {
        throw new Error('No response from OpenAI');
      }

      Logger.openai.success('Summary generation completed');

      return summary;

    } catch (error) {
      Logger.openai.error('Summary generation failed', error as Error);
      throw error;
    }
  }

  /**
   * Extract key information from document
   */
  async extractKeyInformation(content: string, extractionType: 'entities' | 'dates' | 'numbers' | 'contacts' = 'entities'): Promise<string[]> {
    try {
      Logger.openai.start('Key information extraction started');
      Logger.openai.request({ extractionType });

      const typePrompts = {
        entities: 'Extract all important entities (people, organizations, locations, products)',
        dates: 'Extract all dates, deadlines, and time-related information',
        numbers: 'Extract all important numbers, amounts, percentages, and metrics',
        contacts: 'Extract all contact information (emails, phones, addresses)'
      };

      const prompt = `${typePrompts[extractionType]} from this document:

${content.substring(0, 3000)}${content.length > 3000 ? '...' : ''}

Return as a JSON array of strings, with each item being a distinct piece of information.`;

      const response = await this.client.chat.completions.create({
        model: this.config.model!,
        messages: [
          {
            role: 'system',
            content: 'You are an information extraction expert. Return only the requested information as a clean JSON array.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      const extracted = JSON.parse(result) as string[];
      
      Logger.openai.success('Key information extraction completed');

      return extracted;

    } catch (error) {
      Logger.openai.error('Key information extraction failed', error as Error);
      throw error;
    }
  }

  /**
   * Validate API connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      Logger.openai.start('Validating OpenAI connection');

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });

      const isValid = !!response.choices[0]?.message?.content;
      
      if (isValid) {
        Logger.openai.success('OpenAI connection validated');
      } else {
        Logger.openai.error('OpenAI connection validation failed - no response');
      }

      return isValid;

    } catch (error) {
      Logger.openai.error('OpenAI connection validation failed', error as Error);
      return false;
    }
  }
}

/**
 * Default OpenAI service instance
 */
export const openaiService = new OpenAIService();

/**
 * Helper functions for common operations
 */
export const OpenAIHelpers = {
  /**
   * Quick document analysis
   */
  async analyzeDocument(content: string, filename?: string): Promise<DocumentAnalysisResult> {
    return openaiService.analyzeDocument(content, filename);
  },

  /**
   * Quick document comparison
   */
  async compareDocuments(content1: string, content2: string): Promise<TextComparisonResult> {
    return openaiService.compareDocuments(content1, content2);
  },

  /**
   * Quick summary generation
   */
  async generateSummary(contents: string[]): Promise<string> {
    return openaiService.generateSummary(contents);
  },

  /**
   * Quick key information extraction
   */
  async extractEntities(content: string): Promise<string[]> {
    return openaiService.extractKeyInformation(content, 'entities');
  },

  /**
   * Test OpenAI connection
   */
  async testConnection(): Promise<boolean> {
    return openaiService.validateConnection();
  }
};

export default OpenAIService;