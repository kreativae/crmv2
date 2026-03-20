import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    } else {
      logger.warn('⚠️ SMTP not configured, emails will be logged only');
    }
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      logger.info(`📧 [Mock Email] To: ${to}, Subject: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
      });
      logger.info(`📧 Email sent to ${to}: ${subject}`);
    } catch (error) {
      logger.error(`❌ Failed to send email to ${to}:`, error);
      throw new Error('Falha ao enviar email');
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bem-vindo ao NexCRM! 🎉</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${name}</strong>,</p>
            <p>Sua conta foi criada com sucesso! Estamos muito felizes em ter você conosco.</p>
            <p>Com o NexCRM, você pode:</p>
            <ul>
              <li>📊 Gerenciar leads e clientes</li>
              <li>💬 Unificar todas as conversas em um só lugar</li>
              <li>🤖 Automatizar processos com IA</li>
              <li>📈 Acompanhar métricas em tempo real</li>
            </ul>
            <a href="${env.FRONTEND_URL}" class="button">Acessar NexCRM</a>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} NexCRM. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(to, 'Bem-vindo ao NexCRM! 🎉', html);
  }

  async sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Redefinir Senha</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${name}</strong>,</p>
            <p>Recebemos uma solicitação para redefinir sua senha do NexCRM.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <a href="${resetUrl}" class="button">Redefinir Senha</a>
            <div class="warning">
              <p><strong>⚠️ Importante:</strong></p>
              <ul>
                <li>Este link expira em 30 minutos</li>
                <li>Se você não solicitou isso, ignore este email</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} NexCRM. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(to, '🔐 Redefinir senha - NexCRM', html);
  }

  async sendPasswordChangedEmail(to: string, name: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Senha Alterada</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${name}</strong>,</p>
            <p>Sua senha do NexCRM foi alterada com sucesso.</p>
            <p>Se você não fez essa alteração, entre em contato conosco imediatamente.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} NexCRM. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(to, '✅ Senha alterada - NexCRM', html);
  }

  async sendInviteEmail(to: string, inviterName: string, organizationName: string, inviteUrl: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📬 Você foi convidado!</h1>
          </div>
          <div class="content">
            <p>Olá!</p>
            <p><strong>${inviterName}</strong> convidou você para fazer parte da equipe <strong>${organizationName}</strong> no NexCRM.</p>
            <p>Clique no botão abaixo para aceitar o convite e criar sua conta:</p>
            <a href="${inviteUrl}" class="button">Aceitar Convite</a>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} NexCRM. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(to, `📬 Convite para ${organizationName} - NexCRM`, html);
  }
}

export const emailService = new EmailService();
