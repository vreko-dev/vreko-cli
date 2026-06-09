#!/usr/bin/env node
import { config, EntitlementsServiceImpl, getBaseUrl, getOrganizationWithPurchasesAndMembersCount } from './chunk-6XQD7GCV.js';
import './chunk-NKNUAXOU.js';
import './chunk-SPW2D6OO.js';
import { logger } from './chunk-GOYL3F4T.js';
import { combinedSchema, db } from './chunk-HPXAICWM.js';
import { createLogger, LogLevel } from './chunk-OOVZVXTB.js';
import './chunk-KJWKY4L4.js';
import './chunk-VNFWNWEY.js';
import { __name } from './chunk-EWOJGXRX.js';
import { Resend } from 'resend';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { Html, Head, Font, Tailwind, Body, Preview, Section, Container, Img, Text, Hr, Link, Button, Heading } from '@react-email/components';
import { z } from 'zod';
import { render } from '@react-email/render';
import { Client } from '@hubspot/api-client';
import 'drizzle-orm';
import Stripe from 'stripe';
import 'events';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getOAuthState } from 'better-auth/api';
import { bearer, deviceAuthorization, admin, openAPI, magicLink, organization } from 'better-auth/plugins';
import { nanoid } from 'nanoid';

process.env.VREKO_CLI='true';process.env.NODE_NO_WARNINGS='1';

// ../../packages/config/dist/client.js
config.payments.plans;
var __defProp = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp(target, "name", {
  value,
  configurable: true
}), "__name");
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is required");
  }
  return new Resend(apiKey);
}
__name(getResendClient, "getResendClient");
__name2(getResendClient, "getResendClient");
var _resend;
new Proxy({}, {
  get(_target, prop) {
    if (!_resend) {
      _resend = getResendClient();
    }
    return _resend[prop];
  }
});
async function sendEmail({ from, to, subject, html, text }) {
  const client = getResendClient();
  return client.emails.send({
    from,
    to,
    subject,
    html,
    text
  });
}
__name(sendEmail, "sendEmail");
__name2(sendEmail, "sendEmail");

// ../../packages/integrations/dist/email/handlers/billing-events.js
(class {
  static {
    __name(this, "BillingEmailHandler");
  }
  emailService;
  constructor(emailService2) {
    this.emailService = emailService2;
  }
  /**
   * Send welcome email after successful subscription
   */
  async sendWelcome(params) {
    const request = {
      to: {
        email: params.to,
        userId: params.userId
      },
      category: "onboarding",
      priority: "high",
      template: {
        id: "product.welcome",
        props: {
          firstName: params.firstName,
          planName: params.planName,
          planFeatures: params.planFeatures,
          dashboardUrl: params.dashboardUrl,
          docsUrl: params.docsUrl,
          pioneerTier: params.pioneerTier,
          pioneerPoints: params.pioneerPoints
        }
      }
    };
    await this.emailService.send(request);
  }
  /**
   * Send subscription cancellation confirmation
   */
  async sendCancellationConfirmation(params) {
    const request = {
      to: {
        email: params.to,
        userId: params.userId
      },
      category: "billing",
      priority: "high",
      template: {
        id: "product.system-alert",
        props: {
          alertType: "subscription_cancelled",
          title: "Subscription Cancelled",
          message: `Your ${params.planName} subscription has been cancelled and will remain active until ${params.cancellationDate.toLocaleDateString()}. Your data will be retained for ${params.dataRetentionDays} days after that date.`,
          severity: "info",
          actionRequired: false,
          additionalDetails: "You can reactivate your subscription at any time before the retention period ends.",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    };
    await this.emailService.send(request);
  }
  /**
   * Send payment failure alert
   */
  async sendPaymentFailed(params) {
    const request = {
      to: {
        email: params.to,
        userId: params.userId
      },
      category: "billing",
      priority: "critical",
      template: {
        id: "product.system-alert",
        props: {
          alertType: "payment_failed",
          title: "Payment Failed",
          message: `We were unable to process your payment of ${params.amount} ${params.currency} for your ${params.planName} subscription. We'll automatically retry on ${params.retryDate.toLocaleDateString()}.`,
          severity: "warning",
          actionRequired: true,
          actionUrl: params.updatePaymentUrl,
          actionLabel: "Update Payment Method",
          additionalDetails: "To avoid service interruption, please update your payment method or ensure sufficient funds are available.",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    };
    await this.emailService.send(request);
  }
  /**
   * Send subscription upgraded notification
   */
  async sendSubscriptionUpgraded(params) {
    const request = {
      to: {
        email: params.to,
        userId: params.userId
      },
      category: "billing",
      priority: "normal",
      template: {
        id: "product.system-alert",
        props: {
          alertType: "subscription_upgraded",
          title: "Subscription Upgraded",
          message: `You've successfully upgraded from ${params.oldPlan} to ${params.newPlan}. Your new features are now active!`,
          severity: "info",
          actionRequired: false,
          actionUrl: params.dashboardUrl,
          actionLabel: "Explore New Features",
          additionalDetails: `New features: ${params.newFeatures.join(", ")}`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    };
    await this.emailService.send(request);
  }
  /**
   * Send trial ending reminder
   */
  async sendTrialEnding(params) {
    const request = {
      to: {
        email: params.to,
        userId: params.userId
      },
      category: "billing",
      priority: "high",
      template: {
        id: "product.system-alert",
        props: {
          alertType: "trial_ending",
          title: `Your ${params.planName} Trial Ends Soon`,
          message: `Your free trial ends in ${params.daysRemaining} day${params.daysRemaining !== 1 ? "s" : ""} on ${params.trialEndDate.toLocaleDateString()}. Upgrade now to keep your data and continue using Vreko.`,
          severity: "warning",
          actionRequired: true,
          actionUrl: params.upgradeUrl,
          actionLabel: "Upgrade Now",
          additionalDetails: "After your trial ends, you can still access your account but snapshot capture will be disabled until you upgrade.",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    };
    await this.emailService.send(request);
  }
  /**
   * Send suspension notice (Day 8 of grace period)
   *
   * Called when subscription transitions from past_due to suspended
   * after 7-day grace period expires without successful payment.
   */
  async sendSuspensionNotice(params) {
    const request = {
      to: {
        email: params.to,
        userId: params.userId
      },
      category: "billing",
      priority: "critical",
      template: {
        id: "product.system-alert",
        props: {
          alertType: "subscription_suspended",
          title: "Your Subscription Has Been Suspended",
          message: `Your ${params.planName} subscription has been suspended due to payment issues. Cloud features including snapshot sync, pattern library, and history are now paused.`,
          severity: "error",
          actionRequired: true,
          actionUrl: params.reactivateUrl,
          actionLabel: "Reactivate Now",
          additionalDetails: "Update your payment method to restore full access. Your local CLI features remain available, but cloud syncing is disabled until payment is resolved.",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    };
    await this.emailService.send(request);
  }
});
var brand = {
  background: "#0A0A0A",
  surface: "#111111",
  surfaceElevated: "#1A1A1A",
  border: "#27272A",
  primary: "#4ADE80",
  primaryDark: "#22C55E",
  textPrimary: "#FAFAFA",
  textSecondary: "#A1A1AA",
  textMuted: "#52525B",
  danger: "#EF4444",
  warning: "#FF6B35",
  success: "#34D399",
  info: "#3B82F6"
};
var EMAIL_HEADER_URL = "https://vreko.dev/brand/email/email-header.png";
var EMAIL_FOOTER_ICON_URL = "https://vreko.dev/brand/email/email-footer-icon.png";
function Wrapper({ preview, children }) {
  return jsxs(Html, {
    lang: "en",
    children: [
      jsx(Head, {
        children: jsx(Font, {
          fontFamily: "Inter",
          fallbackFontFamily: "Arial",
          fontWeight: 400,
          fontStyle: "normal"
        })
      }),
      jsx(Tailwind, {
        config: {
          theme: {
            extend: {
              colors: {
                "sb-bg": brand.background,
                "sb-surface": brand.surface,
                "sb-elevated": brand.surfaceElevated,
                "sb-border": brand.border,
                "sb-green": brand.primary,
                "sb-green-dark": brand.primaryDark,
                "sb-text": brand.textPrimary,
                "sb-muted": brand.textSecondary,
                "sb-faint": brand.textMuted,
                "sb-danger": brand.danger,
                "sb-warning": brand.warning,
                "sb-success": brand.success,
                "sb-info": brand.info
              }
            }
          }
        },
        children: jsxs(Body, {
          style: {
            backgroundColor: brand.background,
            margin: 0,
            padding: 0
          },
          children: [
            jsx(Preview, {
              children: preview
            }),
            jsx(Section, {
              style: {
                backgroundColor: brand.background,
                padding: "32px 16px"
              },
              children: jsxs(Container, {
                style: {
                  maxWidth: "600px",
                  margin: "0 auto"
                },
                children: [
                  jsx(Section, {
                    style: {
                      marginBottom: 0
                    },
                    children: jsx(Img, {
                      src: EMAIL_HEADER_URL,
                      width: "600",
                      height: "200",
                      alt: "Vreko",
                      style: {
                        width: "100%",
                        display: "block",
                        borderRadius: "8px 8px 0 0"
                      }
                    })
                  }),
                  jsx(Section, {
                    style: {
                      backgroundColor: brand.surface,
                      borderRadius: "0 0 8px 8px",
                      border: `1px solid ${brand.border}`,
                      borderTop: "none",
                      padding: "32px"
                    },
                    children
                  }),
                  jsxs(Section, {
                    style: {
                      marginTop: "24px",
                      padding: "0 16px",
                      textAlign: "center"
                    },
                    children: [
                      jsx(Img, {
                        src: EMAIL_FOOTER_ICON_URL,
                        width: "24",
                        height: "24",
                        alt: "",
                        style: {
                          display: "block",
                          margin: "0 auto 12px"
                        }
                      }),
                      jsx(Text, {
                        style: {
                          color: brand.textMuted,
                          fontSize: "12px",
                          lineHeight: "1.5",
                          margin: 0
                        },
                        children: "Vreko - AI-Aware Code Protection"
                      }),
                      jsx(Hr, {
                        style: {
                          borderColor: brand.border,
                          margin: "12px 0"
                        }
                      }),
                      jsxs(Text, {
                        style: {
                          color: brand.textMuted,
                          fontSize: "12px",
                          margin: 0
                        },
                        children: [
                          jsx(Link, {
                            href: "https://vreko.dev/unsubscribe",
                            style: {
                              color: brand.textMuted,
                              textDecoration: "underline"
                            },
                            children: "Unsubscribe"
                          }),
                          " \xB7 ",
                          jsx(Link, {
                            href: "https://vreko.dev/privacy",
                            style: {
                              color: brand.textMuted,
                              textDecoration: "underline"
                            },
                            children: "Privacy Policy"
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            })
          ]
        })
      })
    ]
  });
}
__name(Wrapper, "Wrapper");

// ../../packages/integrations/dist/email/components/PrimaryButton.js
function PrimaryButton({ href, children }) {
  return jsx(Button, {
    href,
    style: {
      backgroundColor: brand.primary,
      color: brand.background,
      fontWeight: 600,
      borderRadius: "8px",
      padding: "12px 24px",
      fontSize: "14px",
      textDecoration: "none",
      display: "inline-block"
    },
    children
  });
}
__name(PrimaryButton, "PrimaryButton");
function DangerButton({ href, children }) {
  return jsx(Button, {
    href,
    style: {
      backgroundColor: brand.danger,
      color: "#FFFFFF",
      fontWeight: 600,
      borderRadius: "8px",
      padding: "12px 24px",
      fontSize: "14px",
      textDecoration: "none",
      display: "inline-block"
    },
    children
  });
}
__name(DangerButton, "DangerButton");
function GhostButton({ href, children }) {
  return jsx(Button, {
    href,
    style: {
      backgroundColor: "transparent",
      color: brand.textPrimary,
      fontWeight: 600,
      borderRadius: "8px",
      padding: "12px 24px",
      fontSize: "14px",
      textDecoration: "none",
      display: "inline-block",
      border: `1px solid ${brand.border}`
    },
    children
  });
}
__name(GhostButton, "GhostButton");

// ../../packages/integrations/dist/email/templates/auth/magic-link.js
z.object({
  loginUrl: z.string().url(),
  expiresInMinutes: z.number().default(15),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});
function MagicLink({ loginUrl, expiresInMinutes, ipAddress, userAgent }) {
  return jsxs(Wrapper, {
    preview: `Click to sign in  -  link expires in ${expiresInMinutes} minutes`,
    children: [
      jsx(Heading, {
        style: {
          color: brand.textPrimary,
          fontSize: "24px",
          fontWeight: 700,
          margin: "0 0 12px"
        },
        children: "\u{1F98E} Your sign-in link"
      }),
      jsxs(Text, {
        style: {
          color: brand.textSecondary,
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 24px"
        },
        children: [
          "Click the button below to sign in to Vreko. This link expires in ",
          expiresInMinutes,
          " minutes and can only be used once."
        ]
      }),
      jsx(PrimaryButton, {
        href: loginUrl,
        children: "Sign In to Vreko"
      }),
      (ipAddress ?? userAgent) && jsxs(Fragment, {
        children: [
          jsx(Hr, {
            style: {
              borderColor: brand.border,
              margin: "24px 0"
            }
          }),
          jsxs(Section, {
            style: {
              backgroundColor: brand.surfaceElevated,
              borderRadius: "6px",
              padding: "16px",
              border: `1px solid ${brand.border}`
            },
            children: [
              jsx(Text, {
                style: {
                  color: brand.textSecondary,
                  fontSize: "12px",
                  margin: "0 0 4px",
                  fontWeight: 600
                },
                children: "Request details"
              }),
              ipAddress && jsxs(Text, {
                style: {
                  color: brand.textMuted,
                  fontSize: "12px",
                  margin: "0 0 2px"
                },
                children: [
                  "IP address: ",
                  ipAddress
                ]
              }),
              userAgent && jsxs(Text, {
                style: {
                  color: brand.textMuted,
                  fontSize: "12px",
                  margin: 0
                },
                children: [
                  "Device: ",
                  userAgent
                ]
              })
            ]
          })
        ]
      }),
      jsx(Hr, {
        style: {
          borderColor: brand.border,
          margin: "24px 0"
        }
      }),
      jsx(Text, {
        style: {
          color: brand.textMuted,
          fontSize: "12px",
          margin: 0
        },
        children: "If you didn't request this link, you can safely ignore this email. Someone may have entered your email address by mistake."
      })
    ]
  });
}
__name(MagicLink, "MagicLink");
MagicLink.PreviewProps = {
  loginUrl: "https://vreko.dev/auth/magic/preview-token",
  expiresInMinutes: 15,
  ipAddress: "203.0.113.42",
  userAgent: "Chrome on macOS"
};
({
  previewProps: MagicLink.PreviewProps});
z.object({
  deviceName: z.string(),
  location: z.string().optional(),
  ipAddress: z.string(),
  timestamp: z.string(),
  approveUrl: z.string().url(),
  denyUrl: z.string().url()
});
function NewDeviceLogin({ deviceName, location, ipAddress, timestamp, approveUrl, denyUrl }) {
  return jsxs(Wrapper, {
    preview: "New device detected  -  verify this was you",
    children: [
      jsx(Heading, {
        style: {
          color: brand.textPrimary,
          fontSize: "24px",
          fontWeight: 700,
          margin: "0 0 12px"
        },
        children: "\u{1F98E} New sign-in detected"
      }),
      jsx(Text, {
        style: {
          color: brand.textSecondary,
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 24px"
        },
        children: "We detected a new sign-in to your Vreko account. Please verify this was you."
      }),
      jsxs(Section, {
        style: {
          backgroundColor: brand.surfaceElevated,
          borderRadius: "8px",
          padding: "20px",
          border: `1px solid ${brand.border}`,
          marginBottom: "24px"
        },
        children: [
          jsx(Text, {
            style: {
              color: brand.textSecondary,
              fontSize: "12px",
              fontWeight: 600,
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            },
            children: "Sign-in details"
          }),
          jsx("table", {
            style: {
              width: "100%",
              borderCollapse: "collapse"
            },
            children: jsxs("tbody", {
              children: [
                jsxs("tr", {
                  children: [
                    jsx("td", {
                      style: {
                        color: brand.textMuted,
                        fontSize: "13px",
                        padding: "4px 0",
                        width: "40%"
                      },
                      children: "Device"
                    }),
                    jsx("td", {
                      style: {
                        color: brand.textPrimary,
                        fontSize: "13px",
                        padding: "4px 0"
                      },
                      children: deviceName
                    })
                  ]
                }),
                jsxs("tr", {
                  children: [
                    jsx("td", {
                      style: {
                        color: brand.textMuted,
                        fontSize: "13px",
                        padding: "4px 0"
                      },
                      children: "IP address"
                    }),
                    jsx("td", {
                      style: {
                        color: brand.textPrimary,
                        fontSize: "13px",
                        padding: "4px 0"
                      },
                      children: ipAddress
                    })
                  ]
                }),
                location && jsxs("tr", {
                  children: [
                    jsx("td", {
                      style: {
                        color: brand.textMuted,
                        fontSize: "13px",
                        padding: "4px 0"
                      },
                      children: "Location"
                    }),
                    jsx("td", {
                      style: {
                        color: brand.textPrimary,
                        fontSize: "13px",
                        padding: "4px 0"
                      },
                      children: location
                    })
                  ]
                }),
                jsxs("tr", {
                  children: [
                    jsx("td", {
                      style: {
                        color: brand.textMuted,
                        fontSize: "13px",
                        padding: "4px 0"
                      },
                      children: "Time"
                    }),
                    jsx("td", {
                      style: {
                        color: brand.textPrimary,
                        fontSize: "13px",
                        padding: "4px 0"
                      },
                      children: timestamp
                    })
                  ]
                })
              ]
            })
          })
        ]
      }),
      jsx(Text, {
        style: {
          color: brand.textSecondary,
          fontSize: "14px",
          margin: "0 0 16px"
        },
        children: "Was this you?"
      }),
      jsx("table", {
        style: {
          borderCollapse: "collapse"
        },
        children: jsx("tbody", {
          children: jsxs("tr", {
            children: [
              jsx("td", {
                style: {
                  paddingRight: "12px"
                },
                children: jsx(PrimaryButton, {
                  href: approveUrl,
                  children: "Yes, this was me"
                })
              }),
              jsx("td", {
                children: jsx(DangerButton, {
                  href: denyUrl,
                  children: "No, secure my account"
                })
              })
            ]
          })
        })
      }),
      jsx(Hr, {
        style: {
          borderColor: brand.border,
          margin: "24px 0"
        }
      }),
      jsx(Text, {
        style: {
          color: brand.textMuted,
          fontSize: "12px",
          margin: 0
        },
        children: `If this was you, no action is needed. If you don't recognize this activity, secure your account immediately by clicking "No, secure my account".`
      })
    ]
  });
}
__name(NewDeviceLogin, "NewDeviceLogin");
NewDeviceLogin.PreviewProps = {
  deviceName: "Chrome on macOS",
  location: "San Francisco, CA",
  ipAddress: "203.0.113.42",
  timestamp: "March 29, 2026 at 2:34 PM UTC",
  approveUrl: "https://vreko.dev/auth/device/approve/preview",
  denyUrl: "https://vreko.dev/auth/device/deny/preview"
};
({
  previewProps: NewDeviceLogin.PreviewProps});
z.object({
  resetUrl: z.string().url(),
  expiresInMinutes: z.number().default(60),
  requestedFrom: z.object({
    ipAddress: z.string(),
    location: z.string().optional()
  }).optional()
});
function ResetPassword({ resetUrl, expiresInMinutes, requestedFrom }) {
  return jsxs(Wrapper, {
    preview: "A password reset was requested for your account",
    children: [
      jsx(Heading, {
        style: {
          color: brand.textPrimary,
          fontSize: "24px",
          fontWeight: 700,
          margin: "0 0 12px"
        },
        children: "Reset your password"
      }),
      jsxs(Text, {
        style: {
          color: brand.textSecondary,
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 24px"
        },
        children: [
          "We received a request to reset the password for your Vreko account. Click the button below to choose a new password. This link expires in ",
          expiresInMinutes,
          " minutes."
        ]
      }),
      jsx(PrimaryButton, {
        href: resetUrl,
        children: "Reset Password"
      }),
      requestedFrom && jsxs(Fragment, {
        children: [
          jsx(Hr, {
            style: {
              borderColor: brand.border,
              margin: "24px 0"
            }
          }),
          jsxs(Section, {
            style: {
              backgroundColor: brand.surfaceElevated,
              borderRadius: "6px",
              padding: "16px",
              border: `1px solid ${brand.border}`
            },
            children: [
              jsx(Text, {
                style: {
                  color: brand.textSecondary,
                  fontSize: "12px",
                  margin: "0 0 4px",
                  fontWeight: 600
                },
                children: "Request originated from"
              }),
              jsxs(Text, {
                style: {
                  color: brand.textMuted,
                  fontSize: "12px",
                  margin: "0 0 2px"
                },
                children: [
                  "IP address: ",
                  requestedFrom.ipAddress
                ]
              }),
              requestedFrom.location && jsxs(Text, {
                style: {
                  color: brand.textMuted,
                  fontSize: "12px",
                  margin: 0
                },
                children: [
                  "Location: ",
                  requestedFrom.location
                ]
              })
            ]
          })
        ]
      }),
      jsx(Hr, {
        style: {
          borderColor: brand.border,
          margin: "24px 0"
        }
      }),
      jsx(Text, {
        style: {
          color: brand.textSecondary,
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 16px"
        },
        children: "If you didn't request a password reset, your account may be at risk. Secure it now:"
      }),
      jsx(DangerButton, {
        href: "https://vreko.dev/support/security",
        children: "I didn't request this"
      }),
      jsx(Hr, {
        style: {
          borderColor: brand.border,
          margin: "24px 0"
        }
      }),
      jsx(Text, {
        style: {
          color: brand.textMuted,
          fontSize: "12px",
          margin: 0
        },
        children: "If you ignore this email, your password will not be changed."
      })
    ]
  });
}
__name(ResetPassword, "ResetPassword");
ResetPassword.PreviewProps = {
  resetUrl: "https://vreko.dev/auth/reset/preview-token",
  expiresInMinutes: 60,
  requestedFrom: {
    ipAddress: "203.0.113.42",
    location: "San Francisco, CA"
  }
};
({
  previewProps: ResetPassword.PreviewProps});
z.object({
  verificationUrl: z.string().url(),
  expiresInMinutes: z.number().default(15)
});
function VerifyEmail({ verificationUrl, expiresInMinutes }) {
  return jsxs(Wrapper, {
    preview: "Verify your Vreko email address",
    children: [
      jsx(Heading, {
        style: {
          color: brand.textPrimary,
          fontSize: "24px",
          fontWeight: 700,
          margin: "0 0 12px"
        },
        children: "Verify your email"
      }),
      jsxs(Text, {
        style: {
          color: brand.textSecondary,
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 24px"
        },
        children: [
          "Click the button below to verify your email address. This link expires in ",
          expiresInMinutes,
          " minutes."
        ]
      }),
      jsx(PrimaryButton, {
        href: verificationUrl,
        children: "Verify Email Address"
      }),
      jsx(Hr, {
        style: {
          borderColor: brand.border,
          margin: "24px 0"
        }
      }),
      jsx(Text, {
        style: {
          color: brand.textMuted,
          fontSize: "12px",
          margin: 0
        },
        children: "If you didn't create a Vreko account, you can safely ignore this email."
      })
    ]
  });
}
__name(VerifyEmail, "VerifyEmail");
VerifyEmail.PreviewProps = {
  verificationUrl: "https://vreko.dev/verify/preview-token",
  expiresInMinutes: 15
};
({
  previewProps: VerifyEmail.PreviewProps});
var __defProp2 = Object.defineProperty;
var __name3 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", {
  value,
  configurable: true
}), "__name");
var emailTheme = {
  colors: {
    // Backgrounds - Dark mode optimized
    background: "#0A0A0A",
    backgroundSecondary: "#141414",
    surface: "#111111",
    surfaceSubtle: "#18181B",
    // Brand - Vreko Green (#4ADE80)
    primary: "#4ADE80",
    // Text - High contrast for email clients
    text: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textTertiary: "#71717A",
    textMuted: "#71717A",
    textDisabled: "#52525B",
    // UI Elements
    border: "#27272A",
    divider: "#27272A",
    // Semantic Colors
    success: "#34D399",
    error: "#EF4444",
    warning: "#FF6B35",
    info: "#3B82F6"
  },
  fonts: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", Consolas, Monaco, monospace'
  },
  fontSizes: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
    "2xl": "24px"},
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    "2xl": "48px"
  },
  borderRadius: "4px",
  borderWidth: "1px",
  // Email-specific constraints
  maxWidth: "600px",
  // ASCII borders for plain text fallback
  ascii: {
    checkmark: "\u2713"
  }
};
function RepoFooter() {
  const currentYear = /* @__PURE__ */ (/* @__PURE__ */ new Date()).getFullYear();
  return /* @__PURE__ */ jsxs(Section, {
    style: {
      borderTop: `${emailTheme.borderWidth} solid ${emailTheme.colors.border}`,
      paddingTop: emailTheme.spacing.lg,
      marginTop: emailTheme.spacing.xl
    },
    children: [
      /* @__PURE__ */ jsxs(Text, {
        style: {
          margin: 0,
          marginBottom: emailTheme.spacing.sm,
          fontSize: emailTheme.fontSizes.sm,
          color: emailTheme.colors.textMuted,
          fontFamily: emailTheme.fonts.mono
        },
        children: [
          "\u250C\u2500 Vreko \xA9 ",
          currentYear
        ]
      }),
      /* @__PURE__ */ jsxs(Text, {
        style: {
          margin: 0,
          marginBottom: emailTheme.spacing.sm,
          fontSize: emailTheme.fontSizes.sm,
          color: emailTheme.colors.textMuted
        },
        children: [
          /* @__PURE__ */ jsx(Link, {
            href: "https://vreko.dev",
            style: {
              color: emailTheme.colors.primary,
              textDecoration: "none"
            },
            children: "vreko.dev"
          }),
          " \u2022 ",
          /* @__PURE__ */ jsx(Link, {
            href: "https://vreko.dev/docs",
            style: {
              color: emailTheme.colors.textSecondary,
              textDecoration: "none"
            },
            children: "Docs"
          }),
          " \u2022 ",
          /* @__PURE__ */ jsx(Link, {
            href: "https://github.com/vreko",
            style: {
              color: emailTheme.colors.textSecondary,
              textDecoration: "none"
            },
            children: "GitHub"
          })
        ]
      }),
      /* @__PURE__ */ jsxs(Text, {
        style: {
          margin: 0,
          fontSize: emailTheme.fontSizes.xs,
          color: emailTheme.colors.textDisabled
        },
        children: [
          "You're receiving this email because you have a Vreko account.",
          " ",
          /* @__PURE__ */ jsx(Link, {
            href: "{{unsubscribeUrl}}",
            style: {
              color: emailTheme.colors.textMuted,
              textDecoration: "underline"
            },
            children: "Unsubscribe"
          })
        ]
      })
    ]
  });
}
__name(RepoFooter, "RepoFooter");
__name3(RepoFooter, "RepoFooter");
function TerminalHeader({ status = "online" }) {
  const statusColors = {
    online: emailTheme.colors.success,
    processing: emailTheme.colors.warning,
    offline: emailTheme.colors.textMuted,
    critical: emailTheme.colors.error,
    degraded: emailTheme.colors.warning
  };
  const statusText = {
    online: "\u25CF CONNECTED",
    processing: "\u25CB PROCESSING",
    offline: "\u25CB OFFLINE",
    critical: "\u25CF CRITICAL",
    degraded: "\u25CB DEGRADED"
  };
  return /* @__PURE__ */ jsx(Section, {
    style: {
      borderBottom: `${emailTheme.borderWidth} solid ${emailTheme.colors.border}`,
      paddingBottom: emailTheme.spacing.lg,
      marginBottom: emailTheme.spacing.xl
    },
    children: /* @__PURE__ */ jsx("table", {
      width: "100%",
      style: {
        width: "100%"
      },
      children: /* @__PURE__ */ jsxs("tr", {
        children: [
          /* @__PURE__ */ jsx("td", {
            style: {
              verticalAlign: "middle"
            },
            children: /* @__PURE__ */ jsxs(Heading, {
              style: {
                margin: 0,
                fontSize: emailTheme.fontSizes["2xl"],
                fontWeight: 600,
                color: emailTheme.colors.text,
                fontFamily: emailTheme.fonts.mono
              },
              children: [
                /* @__PURE__ */ jsx("span", {
                  style: {
                    color: emailTheme.colors.primary
                  },
                  children: "$"
                }),
                " Vreko"
              ]
            })
          }),
          /* @__PURE__ */ jsx("td", {
            style: {
              textAlign: "right",
              verticalAlign: "middle"
            },
            children: /* @__PURE__ */ jsx(Text, {
              style: {
                margin: 0,
                fontSize: emailTheme.fontSizes.xs,
                color: statusColors[status],
                fontFamily: emailTheme.fonts.mono,
                letterSpacing: "0.5px"
              },
              children: statusText[status]
            })
          })
        ]
      })
    })
  });
}
__name(TerminalHeader, "TerminalHeader");
__name3(TerminalHeader, "TerminalHeader");
var COLORS = {
  bg: "#0D1117",
  text: "#FFFFFF",
  muted: "#9CA3AF",
  green: "#4ADE80",
  border: "#27272A",
  footer: "#6B7280"
};
var FONT_BODY = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
var FONT_MONO = "'Geist Mono', 'SF Mono', ui-monospace, 'Courier New', Courier, monospace";
var bodyStyle = {
  margin: 0,
  padding: 0,
  backgroundColor: COLORS.bg,
  color: COLORS.text,
  fontFamily: FONT_BODY,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale"
};
var containerStyle = {
  width: "100%",
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: COLORS.bg
};
var sectionStyle = {
  padding: "0 40px"
};
var headerStyle = {
  padding: "48px 40px 0 40px"
};
var footerStyle = {
  padding: "24px 40px 48px 40px",
  fontFamily: FONT_BODY,
  fontSize: "11px",
  lineHeight: "1.6",
  color: COLORS.footer
};
var hrStyle = {
  borderTop: `1px solid ${COLORS.border}`,
  borderRight: "none",
  borderBottom: "none",
  borderLeft: "none",
  margin: "24px 0",
  width: "100%"
};
var footerLinkStyle = {
  color: COLORS.green,
  textDecoration: "none"
};
function VrekoEmailShell({ title = "Vreko", previewText, children, logoUrl = "https://vreko.dev/images/gecko-green.png" }) {
  return /* @__PURE__ */ jsxs(Html, {
    lang: "en",
    dir: "ltr",
    children: [
      /* @__PURE__ */ jsxs(Head, {
        children: [
          /* @__PURE__ */ jsx("meta", {
            charSet: "utf-8"
          }),
          /* @__PURE__ */ jsx("meta", {
            name: "viewport",
            content: "width=device-width, initial-scale=1"
          }),
          /* @__PURE__ */ jsx("meta", {
            httpEquiv: "X-UA-Compatible",
            content: "IE=edge"
          }),
          /* @__PURE__ */ jsx("meta", {
            name: "x-apple-disable-message-reformatting"
          }),
          /* @__PURE__ */ jsx("meta", {
            name: "format-detection",
            content: "telephone=no, date=no, address=no, email=no"
          }),
          /* @__PURE__ */ jsx("meta", {
            name: "color-scheme",
            content: "dark"
          }),
          /* @__PURE__ */ jsx("meta", {
            name: "supported-color-schemes",
            content: "dark"
          }),
          /* @__PURE__ */ jsx("title", {
            children: title
          }),
          /* @__PURE__ */ jsx(Font, {
            fontFamily: "Inter",
            fallbackFontFamily: [
              "Helvetica",
              "Arial",
              "sans-serif"
            ],
            webFont: {
              url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2",
              format: "woff2"
            },
            fontWeight: 400,
            fontStyle: "normal"
          }),
          /* @__PURE__ */ jsx(Font, {
            fontFamily: "Inter",
            fallbackFontFamily: [
              "Helvetica",
              "Arial",
              "sans-serif"
            ],
            webFont: {
              url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa05L7.woff2",
              format: "woff2"
            },
            fontWeight: 600,
            fontStyle: "normal"
          }),
          /* @__PURE__ */ jsx("style", {
            children: `
          :root { color-scheme: dark; supported-color-schemes: dark; }
          [data-ogsc] body, [data-ogsb] body { background-color: ${COLORS.bg} !important; }
          [data-ogsc] .vreko-bg, [data-ogsb] .vreko-bg { background-color: ${COLORS.bg} !important; }
          [data-ogsc] .vreko-fg, [data-ogsb] .vreko-fg { color: ${COLORS.text} !important; }
          [data-ogsc] .vreko-muted, [data-ogsb] .vreko-muted { color: ${COLORS.muted} !important; }
          [data-ogsc] .vreko-green, [data-ogsb] .vreko-green { color: ${COLORS.green} !important; }
        `
          })
        ]
      }),
      /* @__PURE__ */ jsx(Preview, {
        children: previewText
      }),
      /* @__PURE__ */ jsx(Body, {
        style: bodyStyle,
        className: "vreko-bg",
        children: /* @__PURE__ */ jsx("table", {
          role: "presentation",
          width: "100%",
          cellPadding: 0,
          cellSpacing: 0,
          border: 0,
          style: {
            backgroundColor: COLORS.bg,
            width: "100%"
          },
          className: "vreko-bg",
          children: /* @__PURE__ */ jsx("tbody", {
            children: /* @__PURE__ */ jsx("tr", {
              children: /* @__PURE__ */ jsx("td", {
                align: "center",
                style: {
                  backgroundColor: COLORS.bg
                },
                children: /* @__PURE__ */ jsxs(Container, {
                  style: containerStyle,
                  className: "vreko-bg",
                  children: [
                    /* @__PURE__ */ jsx(Section, {
                      style: headerStyle,
                      children: /* @__PURE__ */ jsx(Img, {
                        src: logoUrl,
                        alt: "Vreko",
                        width: "32",
                        height: "32",
                        style: {
                          display: "block",
                          width: "32px",
                          height: "32px",
                          border: 0,
                          outline: "none",
                          textDecoration: "none"
                        }
                      })
                    }),
                    /* @__PURE__ */ jsx(Section, {
                      style: sectionStyle,
                      children: /* @__PURE__ */ jsx("hr", {
                        style: hrStyle
                      })
                    }),
                    /* @__PURE__ */ jsx(Section, {
                      style: sectionStyle,
                      children
                    }),
                    /* @__PURE__ */ jsx(Section, {
                      style: sectionStyle,
                      children: /* @__PURE__ */ jsx("hr", {
                        style: hrStyle
                      })
                    }),
                    /* @__PURE__ */ jsx(Section, {
                      style: footerStyle,
                      children: /* @__PURE__ */ jsxs("p", {
                        style: {
                          margin: 0,
                          fontSize: "11px",
                          lineHeight: "1.6",
                          color: COLORS.footer,
                          fontFamily: FONT_BODY
                        },
                        className: "vreko-muted",
                        children: [
                          "Vreko by Marcelle Labs \xB7 Built on the",
                          " ",
                          /* @__PURE__ */ jsx("a", {
                            href: "https://workspacejson.dev",
                            style: footerLinkStyle,
                            className: "vreko-green",
                            children: "workspace.json"
                          }),
                          " ",
                          "open standard"
                        ]
                      })
                    })
                  ]
                })
              })
            })
          })
        })
      })
    ]
  });
}
__name(VrekoEmailShell, "VrekoEmailShell");
__name3(VrekoEmailShell, "VrekoEmailShell");
var VREKO_COLORS = COLORS;
var VREKO_FONT_BODY = FONT_BODY;
var VREKO_FONT_MONO = FONT_MONO;
function VrekoLayout({ title, preheader, children }) {
  return /* @__PURE__ */ jsx(VrekoEmailShell, {
    title,
    previewText: preheader ?? title,
    children
  });
}
__name(VrekoLayout, "VrekoLayout");
__name3(VrekoLayout, "VrekoLayout");
function AlertBox({ type, children }) {
  const colorMap = {
    info: emailTheme.colors.info,
    success: emailTheme.colors.success,
    warning: emailTheme.colors.warning,
    error: emailTheme.colors.error
  };
  const iconMap = {
    info: "\u2139",
    success: "\u2713",
    warning: "\u26A0",
    error: "\u2715"
  };
  const backgroundColor = colorMap[type];
  const icon = iconMap[type];
  return /* @__PURE__ */ jsx(Section, {
    style: {
      backgroundColor: `${backgroundColor}15`,
      border: `${emailTheme.borderWidth} solid ${backgroundColor}`,
      borderRadius: emailTheme.borderRadius,
      padding: emailTheme.spacing.md,
      margin: `${emailTheme.spacing.lg} 0`
    },
    children: /* @__PURE__ */ jsxs(Text, {
      style: {
        margin: 0,
        color: emailTheme.colors.text,
        fontSize: emailTheme.fontSizes.base
      },
      children: [
        /* @__PURE__ */ jsx("span", {
          style: {
            color: backgroundColor,
            marginRight: emailTheme.spacing.sm,
            fontWeight: 600
          },
          children: icon
        }),
        children
      ]
    })
  });
}
__name(AlertBox, "AlertBox");
__name3(AlertBox, "AlertBox");
function Badge({ label }) {
  return /* @__PURE__ */ jsx(Text, {
    style: {
      margin: "0 0 20px 0",
      fontFamily: VREKO_FONT_MONO,
      fontSize: "11px",
      lineHeight: 1,
      color: VREKO_COLORS.green,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      fontWeight: 600
    },
    children: label
  });
}
__name(Badge, "Badge");
__name3(Badge, "Badge");
function BodyText({ children, mt = 0, mb = 16 }) {
  return /* @__PURE__ */ jsx(Text, {
    style: {
      margin: `${mt}px 0 ${mb}px 0`,
      fontFamily: VREKO_FONT_BODY,
      fontSize: "14px",
      lineHeight: 1.6,
      color: VREKO_COLORS.muted,
      fontWeight: 400
    },
    children
  });
}
__name(BodyText, "BodyText");
__name3(BodyText, "BodyText");
function CodeBlock({ code, copyable = false, webViewUrl, language }) {
  return /* @__PURE__ */ jsxs(Section, {
    style: {
      backgroundColor: emailTheme.colors.surface,
      border: `${emailTheme.borderWidth} solid ${emailTheme.colors.border}`,
      borderRadius: emailTheme.borderRadius,
      padding: emailTheme.spacing.md,
      margin: `${emailTheme.spacing.lg} 0`
    },
    children: [
      copyable && webViewUrl && /* @__PURE__ */ jsxs("div", {
        style: {
          marginBottom: emailTheme.spacing.sm,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        },
        children: [
          /* @__PURE__ */ jsx(Text, {
            style: {
              margin: 0,
              fontSize: emailTheme.fontSizes.xs,
              color: emailTheme.colors.textMuted,
              fontFamily: emailTheme.fonts.mono
            },
            children: language || "code"
          }),
          /* @__PURE__ */ jsx(Link, {
            href: webViewUrl,
            style: {
              fontSize: emailTheme.fontSizes.xs,
              color: emailTheme.colors.primary,
              textDecoration: "none"
            },
            children: "View & Copy \u2192"
          })
        ]
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          fontFamily: emailTheme.fonts.mono,
          fontSize: emailTheme.fontSizes.sm,
          color: emailTheme.colors.text,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          margin: 0
        },
        children: code
      })
    ]
  });
}
__name(CodeBlock, "CodeBlock");
__name3(CodeBlock, "CodeBlock");
function Headline({ children }) {
  return /* @__PURE__ */ jsx(Heading, {
    as: "h1",
    style: {
      margin: "0 0 20px 0",
      fontFamily: VREKO_FONT_BODY,
      fontSize: "20px",
      lineHeight: "1.35",
      fontWeight: 600,
      color: VREKO_COLORS.text,
      textAlign: "left",
      letterSpacing: "-0.01em"
    },
    children
  });
}
__name(Headline, "Headline");
__name3(Headline, "Headline");
function PrimaryButton2({ href, children }) {
  return /* @__PURE__ */ jsx(Button, {
    href,
    style: {
      backgroundColor: emailTheme.colors.primary,
      color: emailTheme.colors.background,
      padding: `${emailTheme.spacing.md} ${emailTheme.spacing.xl}`,
      borderRadius: emailTheme.borderRadius,
      textDecoration: "none",
      fontWeight: 600,
      fontSize: emailTheme.fontSizes.base,
      display: "inline-block",
      margin: `${emailTheme.spacing.lg} 0`,
      border: "none",
      cursor: "pointer"
    },
    children
  });
}
__name(PrimaryButton2, "PrimaryButton");
__name3(PrimaryButton2, "PrimaryButton");
function StatRow({ label, value, unit, icon }) {
  return /* @__PURE__ */ jsx(Section, {
    style: {
      borderBottom: `${emailTheme.borderWidth} solid ${emailTheme.colors.divider}`,
      padding: `${emailTheme.spacing.sm} 0`
    },
    children: /* @__PURE__ */ jsx("table", {
      width: "100%",
      style: {
        width: "100%"
      },
      children: /* @__PURE__ */ jsxs("tr", {
        children: [
          /* @__PURE__ */ jsx("td", {
            style: {
              width: "50%",
              verticalAlign: "middle"
            },
            children: /* @__PURE__ */ jsxs(Text, {
              style: {
                margin: 0,
                fontSize: emailTheme.fontSizes.sm,
                color: emailTheme.colors.textSecondary,
                fontFamily: emailTheme.fonts.mono
              },
              children: [
                icon && /* @__PURE__ */ jsx("span", {
                  style: {
                    marginRight: "8px"
                  },
                  children: icon
                }),
                label
              ]
            })
          }),
          /* @__PURE__ */ jsx("td", {
            style: {
              width: "50%",
              textAlign: "right",
              verticalAlign: "middle"
            },
            children: /* @__PURE__ */ jsxs(Text, {
              style: {
                margin: 0,
                fontSize: emailTheme.fontSizes.lg,
                color: emailTheme.colors.primary,
                fontFamily: emailTheme.fonts.mono,
                fontWeight: 600
              },
              children: [
                value,
                unit && /* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: emailTheme.fontSizes.sm,
                    color: emailTheme.colors.textMuted,
                    marginLeft: emailTheme.spacing.xs
                  },
                  children: unit
                })
              ]
            })
          })
        ]
      })
    })
  });
}
__name(StatRow, "StatRow");
__name3(StatRow, "StatRow");
var TERMINAL_BG = "#111827";
var wrapStyle = {
  width: "100%",
  margin: "0 0 24px 0",
  backgroundColor: TERMINAL_BG,
  borderRadius: "8px",
  border: `1px solid ${VREKO_COLORS.border}`
};
var cellStyle = {
  padding: "16px 20px",
  fontFamily: VREKO_FONT_MONO,
  fontSize: "12px",
  lineHeight: 1.8,
  color: VREKO_COLORS.green,
  whiteSpace: "pre-wrap"
};
function TerminalBlock({ children, cursor = false }) {
  return /* @__PURE__ */ jsx(Section, {
    style: wrapStyle,
    children: /* @__PURE__ */ jsxs(Text, {
      style: cellStyle,
      children: [
        children,
        cursor ? /* @__PURE__ */ jsx("span", {
          style: {
            color: VREKO_COLORS.green
          },
          children: "_"
        }) : null
      ]
    })
  });
}
__name(TerminalBlock, "TerminalBlock");
__name3(TerminalBlock, "TerminalBlock");
z.object({
  verificationUrl: z.string().url(),
  expiresInMinutes: z.number().int().positive()
});
z.object({
  loginUrl: z.string().url(),
  expiresInMinutes: z.number().int().positive(),
  ipAddress: z.string(),
  userAgent: z.string()
});
z.object({
  resetUrl: z.string().url(),
  expiresInMinutes: z.number().int().positive(),
  requestedFrom: z.object({
    ipAddress: z.string(),
    location: z.string().optional()
  })
});
z.object({
  deviceName: z.string(),
  location: z.string(),
  ipAddress: z.string(),
  timestamp: z.date(),
  approveUrl: z.string().url(),
  denyUrl: z.string().url()
});
z.object({
  firstName: z.string(),
  planName: z.string(),
  planFeatures: z.array(z.string()),
  dashboardUrl: z.string().url(),
  docsUrl: z.string().url(),
  pioneerTier: z.string().optional(),
  pioneerPoints: z.number().int().nonnegative().optional()
});
z.object({
  firstName: z.string(),
  oldTier: z.string(),
  newTier: z.string(),
  pointsEarned: z.number().int().nonnegative(),
  totalPoints: z.number().int().nonnegative(),
  nextTierName: z.string().optional(),
  pointsToNextTier: z.number().int().nonnegative().optional(),
  unlockedPerks: z.array(z.object({
    icon: z.string(),
    name: z.string(),
    description: z.string()
  })),
  dashboardUrl: z.string().url()
});
z.object({
  firstName: z.string(),
  weekStartDate: z.string(),
  weekEndDate: z.string(),
  stats: z.object({
    totalSnapshots: z.number().int().nonnegative(),
    testsPassed: z.number().int().nonnegative(),
    regressionsCaught: z.number().int().nonnegative(),
    activeProjects: z.number().int().nonnegative(),
    activeMembers: z.number().int().nonnegative(),
    pioneerPointsEarned: z.number().int().nonnegative(),
    comparisonToPreviousWeek: z.number().optional()
  }),
  highlights: z.array(z.object({
    icon: z.string(),
    title: z.string(),
    description: z.string()
  })),
  dashboardUrl: z.string().url()
});
z.object({
  tier: z.enum([
    "free",
    "pro"
  ]),
  repositoryName: z.string().min(1),
  filePath: z.string().min(1),
  score: z.number().min(0).max(1),
  aiSessionCount: z.number().int().nonnegative(),
  riskLevel: z.enum([
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL"
  ]),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().min(1).optional()
});
z.object({
  amount: z.number().positive(),
  currency: z.string(),
  date: z.date(),
  invoiceUrl: z.string().url(),
  planName: z.string()
});
z.object({
  firstName: z.string(),
  filesRecovered: z.number().int().positive(),
  linesOfCode: z.number().int().nonnegative(),
  timeSavedMinutes: z.number().int().nonnegative(),
  sessionTime: z.string(),
  restoreTime: z.string(),
  aiToolDetected: z.string().optional(),
  dashboardUrl: z.string().url(),
  twitterShareUrl: z.string().url().optional()
});
z.object({
  firstName: z.string(),
  signupDate: z.string(),
  extensionUrl: z.string().url(),
  docsUrl: z.string().url(),
  dashboardUrl: z.string().url()
});
z.object({
  firstName: z.string(),
  currentTier: z.string(),
  currentPoints: z.number().int().nonnegative(),
  nextTierName: z.string().optional(),
  pointsToNextTier: z.number().int().nonnegative().optional(),
  sessionsCompleted: z.number().int().nonnegative(),
  restoresCompleted: z.number().int().nonnegative(),
  daysActive: z.number().int().positive(),
  pioneerDashboardUrl: z.string().url(),
  referralUrl: z.string().url().optional()
});
z.object({
  firstName: z.string(),
  lastActiveDate: z.string(),
  daysInactive: z.number().int().positive(),
  totalSessions: z.number().int().nonnegative(),
  totalTimelineRestores: z.number().int().nonnegative(),
  pioneerTier: z.string().optional(),
  pioneerPoints: z.number().int().nonnegative().optional(),
  dashboardUrl: z.string().url(),
  extensionUrl: z.string().url(),
  feedbackUrl: z.string().url()
});
var CohortInviteContextSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
  cohort: z.number().int().positive()
});
function CohortInvite({ email, code, cohort }) {
  const activationUrl = `https://console.vreko.dev/activate/${code}`;
  const extensionUrl = "https://marketplace.visualstudio.com/items?itemName=vreko.vreko";
  return /* @__PURE__ */ jsxs(VrekoLayout, {
    title: "You're in \u2014 here's your Vreko Pioneer access code",
    preheader: `Your Vreko Pioneer access code for Cohort ${cohort}: ${code}`,
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "online"
      }),
      /* @__PURE__ */ jsxs(Section, {
        style: {
          padding: "32px 24px"
        },
        children: [
          /* @__PURE__ */ jsx(Heading, {
            style: {
              margin: "0 0 16px 0",
              fontSize: "28px",
              fontWeight: "700",
              color: emailTheme.colors.primary,
              fontFamily: emailTheme.fonts.mono,
              textAlign: "center"
            },
            children: "You're in."
          }),
          /* @__PURE__ */ jsxs(Text, {
            style: {
              margin: "0 0 24px 0",
              fontSize: "16px",
              lineHeight: "26px",
              color: emailTheme.colors.textSecondary,
              fontFamily: emailTheme.fonts.sans
            },
            children: [
              "You've been accepted into Vreko Pioneer Cohort ",
              cohort,
              ". Here's your access code \u2014 use it to activate your account at",
              " ",
              /* @__PURE__ */ jsx(Link, {
                href: "https://console.vreko.dev",
                style: {
                  color: emailTheme.colors.primary,
                  textDecoration: "none"
                },
                children: "console.vreko.dev"
              }),
              "."
            ]
          }),
          /* @__PURE__ */ jsx(CodeBlock, {
            code
          }),
          /* @__PURE__ */ jsx(Section, {
            style: {
              textAlign: "center",
              margin: "8px 0 32px 0"
            },
            children: /* @__PURE__ */ jsx(PrimaryButton2, {
              href: activationUrl,
              children: "Activate your account \u2192"
            })
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "0",
              padding: "24px",
              backgroundColor: emailTheme.colors.surfaceSubtle,
              border: `1px solid ${emailTheme.colors.border}`,
              borderRadius: "8px"
            },
            children: [
              /* @__PURE__ */ jsx(Heading, {
                style: {
                  margin: "0 0 12px 0",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.mono
                },
                children: "$ what's next"
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "0 0 8px 0",
                  fontSize: "14px",
                  lineHeight: "22px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: "After activating, install the VS Code extension to start using Vreko in your editor:"
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: 0,
                  fontSize: "14px",
                  lineHeight: "22px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: /* @__PURE__ */ jsx(Link, {
                  href: extensionUrl,
                  style: {
                    color: emailTheme.colors.primary,
                    textDecoration: "none"
                  },
                  children: "Install VS Code extension \u2192"
                })
              })
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(CohortInvite, "CohortInvite");
__name3(CohortInvite, "CohortInvite");
var CohortInviteTemplate = {
  id: "product.cohort-invite",
  category: "product",
  subject: /* @__PURE__ */ __name3(() => "You're in \u2014 here's your Vreko Pioneer access code", "subject"),
  component: CohortInvite,
  previewProps: {
    email: "pioneer@example.com",
    code: "VREKO123",
    cohort: 1
  },
  schema: CohortInviteContextSchema
};
var TemplateRegistry = class TemplateRegistry2 {
  static {
    __name(this, "TemplateRegistry2");
  }
  static {
    __name3(this, "TemplateRegistry");
  }
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous template contexts stored in a single map
  templates = /* @__PURE__ */ new Map();
  /**
  * Register a template
  */
  register(template) {
    if (this.templates.has(template.id)) ;
    this.templates.set(template.id, template);
  }
  /**
  * Get a template by ID
  */
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous template contexts stored in a single map
  get(id) {
    return this.templates.get(id);
  }
  /**
  * Check if template exists
  */
  has(id) {
    return this.templates.has(id);
  }
  /**
  * List all registered templates
  */
  list() {
    return Array.from(this.templates.values()).map((template) => ({
      id: template.id,
      category: template.category,
      description: `${template.category} email template`,
      previewUrl: `/email/preview/${template.id}`
    }));
  }
  /**
  * List templates by category
  */
  listByCategory(category) {
    return this.list().filter((meta) => meta.category === category);
  }
  /**
  * Validate template ID
  */
  validate(id) {
    return this.has(id);
  }
  /**
  * Get template count
  */
  get size() {
    return this.templates.size;
  }
};
var templateRegistry = new TemplateRegistry();
templateRegistry.register(CohortInviteTemplate);
function getResendClient2() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is required");
  }
  return new Resend(apiKey);
}
__name(getResendClient2, "getResendClient");
__name3(getResendClient2, "getResendClient");
var _resend2;
new Proxy({}, {
  get(_target, prop) {
    if (!_resend2) {
      _resend2 = getResendClient2();
    }
    return _resend2[prop];
  }
});
async function sendEmail2({ from, to, subject, html, text }) {
  const client = getResendClient2();
  return client.emails.send({
    from,
    to,
    subject,
    html,
    text
  });
}
__name(sendEmail2, "sendEmail");
__name3(sendEmail2, "sendEmail");
async function sendCohortInviteEmail(input) {
  const html = await render(/* @__PURE__ */ jsx(CohortInvite, {
    ...input
  }));
  const result = await sendEmail2({
    from: "Vreko <q@vreko.dev>",
    to: input.email,
    subject: "You're in \u2014 here's your Vreko Pioneer access code",
    html
  });
  if (result.error) {
    throw new Error(`Resend error sending cohort invite to ${input.email}: ${result.error.message}`);
  }
}
__name(sendCohortInviteEmail, "sendCohortInviteEmail");
__name3(sendCohortInviteEmail, "sendCohortInviteEmail");
function MagicLink2({ loginUrl, expiresInMinutes, ipAddress, userAgent }) {
  return /* @__PURE__ */ jsxs(VrekoLayout, {
    title: "Sign in to Vreko",
    preheader: "Your magic link to sign in",
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "online"
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          fontSize: "18px",
          marginBottom: "24px",
          color: "#FAFAFA"
        },
        children: "Sign in to Vreko"
      }),
      /* @__PURE__ */ jsx(AlertBox, {
        type: "info",
        children: "Click the button below to securely sign in to your Vreko account."
      }),
      /* @__PURE__ */ jsx(PrimaryButton2, {
        href: loginUrl,
        children: "Sign In"
      }),
      /* @__PURE__ */ jsxs(Text, {
        style: {
          color: "#71717A",
          fontSize: "14px",
          marginTop: "16px"
        },
        children: [
          "This magic link expires in ",
          expiresInMinutes,
          " minutes."
        ]
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          fontSize: "14px",
          marginTop: "32px",
          marginBottom: "8px",
          color: "#A1A1AA"
        },
        children: "Request details:"
      }),
      /* @__PURE__ */ jsx(CodeBlock, {
        code: `IP Address: ${ipAddress}
User Agent: ${userAgent}`
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          color: "#71717A",
          fontSize: "14px",
          marginTop: "24px"
        },
        children: "If you didn't request this sign-in link, you can safely ignore this email."
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(MagicLink2, "MagicLink");
__name3(MagicLink2, "MagicLink");
function NewDeviceLogin2({ deviceName, location, ipAddress, timestamp, approveUrl, denyUrl }) {
  return /* @__PURE__ */ jsxs(VrekoLayout, {
    title: "New device sign-in",
    preheader: "New sign-in detected on your Vreko account",
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "processing"
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          fontSize: "18px",
          marginBottom: "24px",
          color: "#FAFAFA"
        },
        children: "New Device Sign-In Detected"
      }),
      /* @__PURE__ */ jsx(AlertBox, {
        type: "warning",
        children: "We detected a sign-in to your Vreko account from a new device."
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          fontSize: "14px",
          marginTop: "24px",
          marginBottom: "8px",
          color: "#A1A1AA"
        },
        children: "Sign-in details:"
      }),
      /* @__PURE__ */ jsx(CodeBlock, {
        code: `Device: ${deviceName}
Location: ${location}
IP Address: ${ipAddress}
Time: ${timestamp.toLocaleString()}`
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          fontSize: "16px",
          marginTop: "32px",
          color: "#FAFAFA"
        },
        children: "Was this you?"
      }),
      /* @__PURE__ */ jsx(PrimaryButton2, {
        href: approveUrl,
        children: "Yes, this was me"
      }),
      /* @__PURE__ */ jsxs(Text, {
        style: {
          marginTop: "16px",
          fontSize: "14px",
          color: "#A1A1AA"
        },
        children: [
          "If this wasn't you,",
          " ",
          /* @__PURE__ */ jsx("a", {
            href: denyUrl,
            style: {
              color: "#EF4444",
              textDecoration: "underline"
            },
            children: "deny this sign-in"
          }),
          " ",
          "and secure your account immediately."
        ]
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(NewDeviceLogin2, "NewDeviceLogin");
__name3(NewDeviceLogin2, "NewDeviceLogin");
function ResetPassword2({ resetUrl, expiresInMinutes, requestedFrom }) {
  return /* @__PURE__ */ jsxs(VrekoLayout, {
    title: "Reset your password",
    preheader: "Reset your Vreko password",
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "processing"
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          fontSize: "18px",
          marginBottom: "24px",
          color: "#FAFAFA"
        },
        children: "Reset Your Password"
      }),
      /* @__PURE__ */ jsx(AlertBox, {
        type: "warning",
        children: "A password reset was requested for your Vreko account. If this wasn't you, please ignore this email."
      }),
      /* @__PURE__ */ jsx(PrimaryButton2, {
        href: resetUrl,
        children: "Reset Password"
      }),
      /* @__PURE__ */ jsxs(Text, {
        style: {
          color: "#71717A",
          fontSize: "14px",
          marginTop: "16px"
        },
        children: [
          "This reset link expires in ",
          expiresInMinutes,
          " minutes."
        ]
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          fontSize: "14px",
          marginTop: "32px",
          marginBottom: "8px",
          color: "#A1A1AA"
        },
        children: "Request details:"
      }),
      /* @__PURE__ */ jsx(CodeBlock, {
        code: `IP Address: ${requestedFrom.ipAddress}${requestedFrom.location ? `
Location: ${requestedFrom.location}` : ""}`
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          color: "#71717A",
          fontSize: "14px",
          marginTop: "24px"
        },
        children: "If you didn't request a password reset, your account may be compromised. Please contact support immediately."
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(ResetPassword2, "ResetPassword");
__name3(ResetPassword2, "ResetPassword");
function VerifyEmail2({ verificationUrl, expiresInMinutes }) {
  return /* @__PURE__ */ jsxs(VrekoLayout, {
    title: "Verify your email",
    preheader: "Click to verify your Vreko account",
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "online"
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          fontSize: "18px",
          marginBottom: "24px",
          color: "#FAFAFA"
        },
        children: "Welcome to Vreko!"
      }),
      /* @__PURE__ */ jsx(AlertBox, {
        type: "info",
        children: "Please verify your email address to activate your account and start using Vreko."
      }),
      /* @__PURE__ */ jsx(PrimaryButton2, {
        href: verificationUrl,
        children: "Verify Email Address"
      }),
      /* @__PURE__ */ jsxs(Text, {
        style: {
          color: "#71717A",
          fontSize: "14px",
          marginTop: "16px"
        },
        children: [
          "This verification link expires in ",
          expiresInMinutes,
          " minutes."
        ]
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          color: "#71717A",
          fontSize: "14px",
          marginTop: "24px"
        },
        children: "If you didn't create a Vreko account, you can safely ignore this email."
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(VerifyEmail2, "VerifyEmail");
__name3(VerifyEmail2, "VerifyEmail");
function ActivationNudge(_) {
  return /* @__PURE__ */ jsxs(VrekoEmailShell, {
    title: "Your daemon is installed. Run vreko start.",
    previewText: "Run vreko start",
    children: [
      /* @__PURE__ */ jsx(Badge, {
        label: "\u25CF AWAITING SESSION"
      }),
      /* @__PURE__ */ jsx(Headline, {
        children: "Your daemon is installed. Run `vreko start`."
      }),
      /* @__PURE__ */ jsx(BodyText, {
        children: "Intelligence calibration begins with your first session. The daemon is ready - it is waiting for you."
      }),
      /* @__PURE__ */ jsx(TerminalBlock, {
        cursor: true,
        children: `$ vreko start
\u25CF daemon started    pid 41288
\u25CF intelligence CALIBRATING_`
      })
    ]
  });
}
__name(ActivationNudge, "ActivationNudge");
__name3(ActivationNudge, "ActivationNudge");
function CliNudge(_) {
  return /* @__PURE__ */ jsxs(VrekoEmailShell, {
    title: "Install the Vreko CLI to start your first session",
    previewText: "Install the Vreko CLI",
    children: [
      /* @__PURE__ */ jsx(Badge, {
        label: "\u25CF NEXT STEP"
      }),
      /* @__PURE__ */ jsx(Headline, {
        children: "Install the Vreko CLI to start your first session."
      }),
      /* @__PURE__ */ jsx(BodyText, {
        children: "The daemon runs locally. One install, then `vreko start` and your codebase intelligence begins accumulating."
      }),
      /* @__PURE__ */ jsx(TerminalBlock, {
        cursor: true,
        children: "npm install -g @vreko/cli"
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          margin: "0",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
          fontSize: "13px",
          lineHeight: "1.6",
          color: "#9CA3AF"
        },
        children: /* @__PURE__ */ jsx("a", {
          href: "https://docs.vreko.dev/install",
          style: {
            color: "#4ADE80",
            textDecoration: "none"
          },
          children: "docs.vreko.dev/install \u2192"
        })
      })
    ]
  });
}
__name(CliNudge, "CliNudge");
__name3(CliNudge, "CliNudge");
function ExtensionNudge(_) {
  return /* @__PURE__ */ jsxs(VrekoEmailShell, {
    title: "Add the VS Code extension to complete your setup",
    previewText: "Add the VS Code extension",
    children: [
      /* @__PURE__ */ jsx(Badge, {
        label: "\u25CF NEXT STEP"
      }),
      /* @__PURE__ */ jsx(Headline, {
        children: "Add the VS Code extension to complete your setup."
      }),
      /* @__PURE__ */ jsx(BodyText, {
        children: "The extension connects to your local daemon and surfaces fragility signals as you work. Takes 30 seconds."
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          margin: "0",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
          fontSize: "13px",
          lineHeight: "1.6",
          color: "#9CA3AF"
        },
        children: /* @__PURE__ */ jsx("a", {
          href: "https://marketplace.visualstudio.com/items?itemName=vreko.vreko",
          style: {
            color: "#4ADE80",
            textDecoration: "none"
          },
          children: "VS Code Marketplace \u2192"
        })
      })
    ]
  });
}
__name(ExtensionNudge, "ExtensionNudge");
__name3(ExtensionNudge, "ExtensionNudge");
function NiceSave({ firstName, filesRecovered, linesOfCode, timeSavedMinutes, sessionTime, restoreTime, aiToolDetected, dashboardUrl, twitterShareUrl }) {
  const timeSavedText = timeSavedMinutes >= 60 ? `${Math.floor(timeSavedMinutes / 60)}h ${timeSavedMinutes % 60}m` : `${timeSavedMinutes}m`;
  return /* @__PURE__ */ jsxs(VrekoLayout, {
    title: "Nice Save! Your Code is Safe",
    preheader: `You just recovered ${filesRecovered} file${filesRecovered !== 1 ? "s" : ""} with Vreko`,
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "online"
      }),
      /* @__PURE__ */ jsxs(Section, {
        style: {
          padding: "32px 24px"
        },
        children: [
          /* @__PURE__ */ jsx(Heading, {
            style: {
              margin: "0 0 16px 0",
              fontSize: "28px",
              fontWeight: "700",
              color: emailTheme.colors.primary,
              fontFamily: emailTheme.fonts.mono,
              textAlign: "center"
            },
            children: "\u{1F389} Nice Save!"
          }),
          /* @__PURE__ */ jsxs(Text, {
            style: {
              margin: "0 0 24px 0",
              fontSize: "16px",
              lineHeight: "24px",
              color: emailTheme.colors.textSecondary,
              fontFamily: emailTheme.fonts.sans,
              textAlign: "center"
            },
            children: [
              "Hey ",
              firstName,
              ", you just recovered your code with Vreko. That's what we're here for!"
            ]
          }),
          /* @__PURE__ */ jsx(AlertBox, {
            type: "success",
            children: /* @__PURE__ */ jsx("span", {
              children: "Your restore completed successfully. Your code is back to its pre-AI state."
            })
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "32px 0",
              padding: "24px",
              backgroundColor: emailTheme.colors.surfaceSubtle,
              border: `1px solid ${emailTheme.colors.border}`,
              borderRadius: "8px"
            },
            children: [
              /* @__PURE__ */ jsx(Heading, {
                style: {
                  margin: "0 0 16px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.mono
                },
                children: "Recovery Summary"
              }),
              /* @__PURE__ */ jsx(StatRow, {
                label: "Files Recovered",
                value: filesRecovered.toString(),
                icon: "\u{1F4C1}"
              }),
              /* @__PURE__ */ jsx(StatRow, {
                label: "Lines of Code",
                value: linesOfCode.toLocaleString(),
                icon: "\u{1F4DD}"
              }),
              /* @__PURE__ */ jsx(StatRow, {
                label: "Time Saved",
                value: timeSavedText,
                icon: "\u23F1\uFE0F"
              }),
              aiToolDetected && /* @__PURE__ */ jsx(StatRow, {
                label: "AI Tool Detected",
                value: aiToolDetected,
                icon: "\u{1F916}"
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "24px 0",
              padding: "20px",
              backgroundColor: emailTheme.colors.backgroundSecondary,
              border: `1px solid ${emailTheme.colors.border}`,
              borderRadius: "8px"
            },
            children: [
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "0 0 12px 0",
                  fontSize: "14px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.mono
                },
                children: [
                  "\u{1F4F8} Session started: ",
                  sessionTime
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: 0,
                  fontSize: "14px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.mono
                },
                children: [
                  "\u23EA Restored at: ",
                  restoreTime
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "32px 0"
            },
            children: [
              /* @__PURE__ */ jsx(Heading, {
                style: {
                  margin: "0 0 16px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.mono
                },
                children: "What Just Happened?"
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "0 0 16px 0",
                  fontSize: "14px",
                  lineHeight: "22px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: "Vreko's AutoDecisionEngine detected changes that needed protection and automatically tracked your session. When you needed to recover, we had your back."
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: 0,
                  fontSize: "14px",
                  lineHeight: "22px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  "Without Vreko, you might have spent ",
                  timeSavedText,
                  " manually reconstructing your code or digging through git history. Instead, one click and you're back."
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              textAlign: "center",
              margin: "32px 0"
            },
            children: [
              /* @__PURE__ */ jsx(PrimaryButton2, {
                href: dashboardUrl,
                children: "View in Dashboard"
              }),
              twitterShareUrl && /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "16px 0 0 0",
                  fontSize: "14px",
                  color: emailTheme.colors.textSecondary
                },
                children: /* @__PURE__ */ jsx(Link, {
                  href: twitterShareUrl,
                  style: {
                    color: emailTheme.colors.primary,
                    textDecoration: "none"
                  },
                  children: "Share your save on Twitter \u2192"
                })
              })
            ]
          }),
          /* @__PURE__ */ jsx(Section, {
            style: {
              margin: "32px 0 0 0",
              padding: "20px",
              backgroundColor: emailTheme.colors.surfaceSubtle,
              border: `1px solid ${emailTheme.colors.primary}`,
              borderRadius: "8px"
            },
            children: /* @__PURE__ */ jsxs(Text, {
              style: {
                margin: 0,
                fontSize: "14px",
                lineHeight: "20px",
                color: emailTheme.colors.text,
                fontFamily: emailTheme.fonts.sans
              },
              children: [
                /* @__PURE__ */ jsx("strong", {
                  style: {
                    color: emailTheme.colors.primary
                  },
                  children: "\u{1F4A1} Pro Tip:"
                }),
                " Vreko learns from your workflow. The more you use it, the smarter it gets at predicting when you'll need protection."
              ]
            })
          })
        ]
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(NiceSave, "NiceSave");
__name3(NiceSave, "NiceSave");
function PioneerIntro({ firstName, currentTier, currentPoints, nextTierName, pointsToNextTier, sessionsCompleted, restoresCompleted, daysActive, pioneerDashboardUrl, referralUrl }) {
  return /* @__PURE__ */ jsxs(VrekoLayout, {
    title: "Welcome to the Pioneer Program!",
    preheader: `You've earned ${currentPoints} Pioneer Points, ${firstName}!`,
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "online"
      }),
      /* @__PURE__ */ jsxs(Section, {
        style: {
          padding: "32px 24px"
        },
        children: [
          /* @__PURE__ */ jsx(Heading, {
            style: {
              margin: "0 0 16px 0",
              fontSize: "28px",
              fontWeight: "700",
              color: emailTheme.colors.primary,
              fontFamily: emailTheme.fonts.mono,
              textAlign: "center"
            },
            children: "\u{1F680} Welcome, Pioneer!"
          }),
          /* @__PURE__ */ jsxs(Text, {
            style: {
              margin: "0 0 24px 0",
              fontSize: "16px",
              lineHeight: "24px",
              color: emailTheme.colors.textSecondary,
              fontFamily: emailTheme.fonts.sans,
              textAlign: "center"
            },
            children: [
              "Hey ",
              firstName,
              "! You've been using Vreko for a week now, and we're excited to officially welcome you to the Pioneer Program."
            ]
          }),
          /* @__PURE__ */ jsx(AlertBox, {
            type: "success",
            children: /* @__PURE__ */ jsxs("span", {
              children: [
                "You're now a ",
                /* @__PURE__ */ jsx("strong", {
                  children: currentTier
                }),
                " with ",
                currentPoints,
                " Pioneer Points!"
              ]
            })
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "32px 0",
              padding: "24px",
              backgroundColor: emailTheme.colors.surfaceSubtle,
              border: `1px solid ${emailTheme.colors.border}`,
              borderRadius: "8px"
            },
            children: [
              /* @__PURE__ */ jsx(Heading, {
                style: {
                  margin: "0 0 16px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.mono
                },
                children: "Your First Week Stats"
              }),
              /* @__PURE__ */ jsx(StatRow, {
                label: "Sessions Completed",
                value: sessionsCompleted.toString(),
                icon: "\u{1F4F8}"
              }),
              /* @__PURE__ */ jsx(StatRow, {
                label: "Timeline Restores",
                value: restoresCompleted.toString(),
                icon: "\u23EA"
              }),
              /* @__PURE__ */ jsx(StatRow, {
                label: "Days Active",
                value: daysActive.toString(),
                icon: "\u{1F4C5}"
              }),
              /* @__PURE__ */ jsx(StatRow, {
                label: "Pioneer Points",
                value: currentPoints.toString(),
                icon: "\u2B50"
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "32px 0"
            },
            children: [
              /* @__PURE__ */ jsx(Heading, {
                style: {
                  margin: "0 0 16px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.mono
                },
                children: "What's the Pioneer Program?"
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "0 0 16px 0",
                  fontSize: "14px",
                  lineHeight: "22px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: "The Pioneer Program rewards our most engaged users with exclusive perks, early access to new features, and real influence on Vreko's roadmap. The more you use Vreko, the more points you earn."
              }),
              nextTierName && pointsToNextTier && /* @__PURE__ */ jsx(Section, {
                style: {
                  margin: "16px 0",
                  padding: "16px",
                  backgroundColor: emailTheme.colors.backgroundSecondary,
                  border: `1px solid ${emailTheme.colors.primary}`,
                  borderRadius: "8px"
                },
                children: /* @__PURE__ */ jsxs(Text, {
                  style: {
                    margin: 0,
                    fontSize: "14px",
                    color: emailTheme.colors.text,
                    fontFamily: emailTheme.fonts.sans
                  },
                  children: [
                    /* @__PURE__ */ jsx("strong", {
                      style: {
                        color: emailTheme.colors.primary
                      },
                      children: "Next tier:"
                    }),
                    " ",
                    nextTierName,
                    /* @__PURE__ */ jsx("br", {}),
                    /* @__PURE__ */ jsxs("span", {
                      style: {
                        color: emailTheme.colors.textSecondary
                      },
                      children: [
                        pointsToNextTier,
                        " more points to unlock"
                      ]
                    })
                  ]
                })
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "32px 0",
              padding: "24px",
              backgroundColor: emailTheme.colors.surfaceSubtle,
              border: `1px solid ${emailTheme.colors.border}`,
              borderRadius: "8px"
            },
            children: [
              /* @__PURE__ */ jsx(Heading, {
                style: {
                  margin: "0 0 16px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.mono
                },
                children: "Ways to Earn Points"
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "8px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  /* @__PURE__ */ jsx("strong", {
                    style: {
                      color: emailTheme.colors.primary
                    },
                    children: "+10 pts"
                  }),
                  " - Daily active use"
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "8px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  /* @__PURE__ */ jsx("strong", {
                    style: {
                      color: emailTheme.colors.primary
                    },
                    children: "+25 pts"
                  }),
                  " - First restore of the week"
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "8px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  /* @__PURE__ */ jsx("strong", {
                    style: {
                      color: emailTheme.colors.primary
                    },
                    children: "+100 pts"
                  }),
                  " - Refer a friend who signs up"
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "8px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  /* @__PURE__ */ jsx("strong", {
                    style: {
                      color: emailTheme.colors.primary
                    },
                    children: "+50 pts"
                  }),
                  " - Share feedback or bug reports"
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "8px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  /* @__PURE__ */ jsx("strong", {
                    style: {
                      color: emailTheme.colors.primary
                    },
                    children: "+200 pts"
                  }),
                  " - Write about Vreko (tweet, blog)"
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              textAlign: "center",
              margin: "32px 0"
            },
            children: [
              /* @__PURE__ */ jsx(PrimaryButton2, {
                href: pioneerDashboardUrl,
                children: "View Pioneer Dashboard"
              }),
              referralUrl && /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "16px 0 0 0",
                  fontSize: "14px",
                  color: emailTheme.colors.textSecondary
                },
                children: /* @__PURE__ */ jsx(Link, {
                  href: referralUrl,
                  style: {
                    color: emailTheme.colors.primary,
                    textDecoration: "none"
                  },
                  children: "Get your referral link \u2192 +100 pts per signup"
                })
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "32px 0 0 0",
              padding: "20px",
              backgroundColor: emailTheme.colors.surfaceSubtle,
              border: `1px solid ${emailTheme.colors.primary}`,
              borderRadius: "8px"
            },
            children: [
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: 0,
                  fontSize: "14px",
                  lineHeight: "22px",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.sans,
                  fontStyle: "italic"
                },
                children: `"Pioneers aren't just users - they're co-builders. Your feedback directly shapes what we build next. We read every message, and top Pioneers get direct access to our team."`
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "12px 0 0 0",
                  fontSize: "13px",
                  color: emailTheme.colors.textSecondary
                },
                children: "- The Vreko Team"
              })
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(PioneerIntro, "PioneerIntro");
__name3(PioneerIntro, "PioneerIntro");
function PioneerMilestone({ firstName, oldTier, newTier, pointsEarned, totalPoints, nextTierName, pointsToNextTier, unlockedPerks, dashboardUrl }) {
  return /* @__PURE__ */ jsxs(VrekoLayout, {
    title: "You've Leveled Up! \u{1F389}",
    preheader: `Congratulations! You've reached ${newTier} tier in the Vreko Pioneer Program`,
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "online"
      }),
      /* @__PURE__ */ jsxs(Section, {
        style: {
          padding: "32px 24px"
        },
        children: [
          /* @__PURE__ */ jsx(Heading, {
            style: {
              margin: "0 0 16px 0",
              fontSize: "24px",
              fontWeight: "600",
              color: emailTheme.colors.text,
              fontFamily: emailTheme.fonts.mono
            },
            children: "$ vreko pioneer level-up"
          }),
          /* @__PURE__ */ jsxs(Text, {
            style: {
              margin: "0 0 24px 0",
              fontSize: "16px",
              lineHeight: "24px",
              color: emailTheme.colors.textSecondary,
              fontFamily: emailTheme.fonts.sans
            },
            children: [
              "Congratulations, ",
              firstName,
              "! You've just advanced from ",
              /* @__PURE__ */ jsx("strong", {
                children: oldTier
              }),
              " to",
              " ",
              /* @__PURE__ */ jsx("strong", {
                children: newTier
              }),
              " in the Vreko Pioneer Program! \u{1F680}"
            ]
          }),
          /* @__PURE__ */ jsxs(AlertBox, {
            type: "success",
            children: [
              "\u{1F389} Tier Upgrade: ",
              oldTier,
              " \u2192 ",
              newTier
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "32px 0",
              padding: "24px",
              backgroundColor: emailTheme.colors.backgroundSecondary,
              border: `1px solid ${emailTheme.colors.primary}`,
              borderRadius: "8px"
            },
            children: [
              /* @__PURE__ */ jsx(Heading, {
                style: {
                  margin: "0 0 20px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.mono
                },
                children: "Your Pioneer Stats"
              }),
              /* @__PURE__ */ jsx(StatRow, {
                label: "Current Tier",
                value: newTier,
                icon: "\u{1F3C6}"
              }),
              /* @__PURE__ */ jsx(StatRow, {
                label: "Total Points",
                value: totalPoints.toString(),
                icon: "\u2B50"
              }),
              /* @__PURE__ */ jsx(StatRow, {
                label: "Points Earned This Milestone",
                value: `+${pointsEarned}`,
                icon: "\u2728"
              }),
              nextTierName && pointsToNextTier && /* @__PURE__ */ jsxs(Section, {
                style: {
                  margin: "20px 0 12px 0",
                  paddingTop: "20px",
                  borderTop: `1px solid ${emailTheme.colors.border}`
                },
                children: [
                  /* @__PURE__ */ jsxs(Text, {
                    style: {
                      margin: "0 0 8px 0",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: emailTheme.colors.textSecondary,
                      fontFamily: emailTheme.fonts.sans
                    },
                    children: [
                      "Next Tier: ",
                      nextTierName
                    ]
                  }),
                  /* @__PURE__ */ jsxs(Text, {
                    style: {
                      margin: 0,
                      fontSize: "13px",
                      lineHeight: "18px",
                      color: emailTheme.colors.textTertiary,
                      fontFamily: emailTheme.fonts.sans
                    },
                    children: [
                      pointsToNextTier,
                      " points away from ",
                      nextTierName
                    ]
                  })
                ]
              })
            ]
          }),
          unlockedPerks.length > 0 && /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "0 0 32px 0"
            },
            children: [
              /* @__PURE__ */ jsx(Heading, {
                style: {
                  margin: "0 0 16px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.mono
                },
                children: "Newly Unlocked Perks"
              }),
              unlockedPerks.map((perk, index) => /* @__PURE__ */ jsxs(Section, {
                style: {
                  margin: "0 0 12px 0",
                  padding: "16px",
                  backgroundColor: emailTheme.colors.surfaceSubtle,
                  border: `1px solid ${emailTheme.colors.border}`,
                  borderRadius: "6px"
                },
                children: [
                  /* @__PURE__ */ jsxs(Text, {
                    style: {
                      margin: "0 0 8px 0",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: emailTheme.colors.primary,
                      fontFamily: emailTheme.fonts.mono
                    },
                    children: [
                      perk.icon,
                      " ",
                      perk.name
                    ]
                  }),
                  /* @__PURE__ */ jsx(Text, {
                    style: {
                      margin: 0,
                      fontSize: "14px",
                      lineHeight: "20px",
                      color: emailTheme.colors.textSecondary,
                      fontFamily: emailTheme.fonts.sans
                    },
                    children: perk.description
                  })
                ]
              }, index))
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "0 0 32px 0",
              padding: "20px",
              backgroundColor: emailTheme.colors.backgroundSecondary,
              border: `1px solid ${emailTheme.colors.border}`,
              borderRadius: "8px"
            },
            children: [
              /* @__PURE__ */ jsx(Heading, {
                style: {
                  margin: "0 0 12px 0",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.mono
                },
                children: "Keep Leveling Up"
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "8px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  emailTheme.ascii.checkmark,
                  " Share Vreko with your team (+50 points per referral)"
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "8px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  emailTheme.ascii.checkmark,
                  " Contribute to our open-source repos (+100 points per merged PR)"
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "8px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  emailTheme.ascii.checkmark,
                  " Write technical content about Vreko (+75 points per article)"
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "8px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  emailTheme.ascii.checkmark,
                  " Build integrations or plugins (+150 points per published plugin)"
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "8px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  emailTheme.ascii.checkmark,
                  " Help others in Discord (+25 points per week of active support)"
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsx(PrimaryButton2, {
            href: dashboardUrl,
            children: "View Pioneer Dashboard"
          }),
          /* @__PURE__ */ jsx(Text, {
            style: {
              margin: "32px 0 0 0",
              fontSize: "13px",
              lineHeight: "18px",
              color: emailTheme.colors.textTertiary,
              fontFamily: emailTheme.fonts.sans,
              textAlign: "center"
            },
            children: "The Vreko Pioneer Program rewards developers who help grow our community. Learn more about tiers and perks in your dashboard."
          })
        ]
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(PioneerMilestone, "PioneerMilestone");
__name3(PioneerMilestone, "PioneerMilestone");
function SystemAlert({ tier, repositoryName, filePath, score, aiSessionCount, riskLevel }) {
  const scoreLabel = score.toFixed(2);
  const previewText = tier === "free" ? `${repositoryName} \xB7 Pro unlocks the file path` : `${repositoryName} \xB7 ${filePath} \xB7 fragility ${scoreLabel}`;
  return /* @__PURE__ */ jsxs(VrekoEmailShell, {
    title: `Vreko intelligence for ${repositoryName}`,
    previewText,
    children: [
      /* @__PURE__ */ jsx(Badge, {
        label: "INTELLIGENCE UPDATE"
      }),
      /* @__PURE__ */ jsx(Headline, {
        children: tier === "free" ? "A fragile file was detected in your workspace." : "Vreko flagged a high-risk file in your codebase."
      }),
      /* @__PURE__ */ jsx(BodyText, {
        children: tier === "free" ? `Vreko found repeated change and rollback patterns in ${repositoryName}.` : `Vreko found repeated change and rollback patterns in ${repositoryName}. The exact file path and score are below.`
      }),
      /* @__PURE__ */ jsx(StatRow, {
        label: "repository",
        value: repositoryName
      }),
      /* @__PURE__ */ jsx(StatRow, {
        label: "fragility score",
        value: scoreLabel,
        icon: "\u25CF"
      }),
      /* @__PURE__ */ jsx(StatRow, {
        label: "AI sessions",
        value: aiSessionCount
      }),
      /* @__PURE__ */ jsx(StatRow, {
        label: "risk level",
        value: riskLevel
      }),
      tier === "pro" ? /* @__PURE__ */ jsx(TerminalBlock, {
        cursor: true,
        children: `file path: ${filePath}
score: ${scoreLabel}
risk: ${riskLevel}`
      }) : /* @__PURE__ */ jsx(BodyText, {
        mt: 24,
        children: "Upgrade to Pro to reveal the exact file path and get the full intelligence card for this file."
      }),
      /* @__PURE__ */ jsxs(BodyText, {
        mt: 8,
        mb: 0,
        children: [
          "Questions about this finding?",
          " ",
          /* @__PURE__ */ jsx("a", {
            href: "mailto:pioneer@vreko.dev",
            style: {
              color: "#4ADE80",
              textDecoration: "none"
            },
            children: "Reply to this email \u2192"
          })
        ]
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          margin: "8px 0 0 0",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
          fontSize: "12px",
          lineHeight: "1.6",
          color: "#9CA3AF"
        },
        children: tier === "free" ? "Free tier keeps the file path hidden." : "Pro tier includes the full file path and intelligence card."
      })
    ]
  });
}
__name(SystemAlert, "SystemAlert");
__name3(SystemAlert, "SystemAlert");
function WeeklyDigest({ firstName, weekStartDate, weekEndDate, stats, highlights, dashboardUrl }) {
  const previewText = `${stats.totalSnapshots} sessions tracked \xB7 ${stats.regressionsCaught} regressions caught`;
  return /* @__PURE__ */ jsxs(VrekoEmailShell, {
    title: "Your Weekly Vreko Summary",
    previewText,
    children: [
      /* @__PURE__ */ jsx(Badge, {
        label: "PIONEER UPDATE"
      }),
      /* @__PURE__ */ jsx(Headline, {
        children: "Here's what changed since your last pulse."
      }),
      /* @__PURE__ */ jsxs(BodyText, {
        children: [
          "Hey ",
          firstName,
          ", here's your testing activity from ",
          weekStartDate,
          " to ",
          weekEndDate,
          ". This is the weekly pulse from the daemon, not a marketing recap."
        ]
      }),
      /* @__PURE__ */ jsx(TerminalBlock, {
        children: [
          `sessions tracked: ${stats.totalSnapshots}`,
          `tests passed: ${stats.testsPassed}`,
          `regressions caught: ${stats.regressionsCaught}`,
          `active projects: ${stats.activeProjects}`,
          `active members: ${stats.activeMembers}`
        ].join("\n")
      }),
      /* @__PURE__ */ jsxs(Section, {
        style: {
          margin: "24px 0 0 0"
        },
        children: [
          /* @__PURE__ */ jsx(StatRow, {
            label: "Sessions tracked",
            value: stats.totalSnapshots,
            icon: "\u25B8"
          }),
          /* @__PURE__ */ jsx(StatRow, {
            label: "Tests passed",
            value: stats.testsPassed,
            icon: "\u2713"
          }),
          /* @__PURE__ */ jsx(StatRow, {
            label: "Regressions caught",
            value: stats.regressionsCaught,
            icon: "\u2691"
          }),
          /* @__PURE__ */ jsx(StatRow, {
            label: "Active projects",
            value: stats.activeProjects,
            icon: "\u25EB"
          }),
          /* @__PURE__ */ jsx(StatRow, {
            label: "Team members active",
            value: stats.activeMembers,
            icon: "\u25CF"
          })
        ]
      }),
      stats.pioneerPointsEarned > 0 ? /* @__PURE__ */ jsxs(BodyText, {
        mt: 24,
        children: [
          "Pioneer points earned this week: +",
          stats.pioneerPointsEarned,
          "."
        ]
      }) : null,
      highlights.length > 0 ? /* @__PURE__ */ jsxs(Section, {
        style: {
          marginTop: "24px"
        },
        children: [
          /* @__PURE__ */ jsx(Headline, {
            children: "Weekly highlights"
          }),
          highlights.map((highlight) => /* @__PURE__ */ jsxs(Section, {
            style: {
              padding: "16px 0",
              borderTop: "1px solid #27272A"
            },
            children: [
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "0 0 6px 0",
                  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#FFFFFF"
                },
                children: [
                  highlight.icon,
                  " ",
                  highlight.title
                ]
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: 0,
                  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "#9CA3AF"
                },
                children: highlight.description
              })
            ]
          }, `${highlight.title}-${highlight.icon}`))
        ]
      }) : null,
      /* @__PURE__ */ jsx(PrimaryButton2, {
        href: dashboardUrl,
        children: "View Full Dashboard"
      })
    ]
  });
}
__name(WeeklyDigest, "WeeklyDigest");
__name3(WeeklyDigest, "WeeklyDigest");
function Welcome({ firstName, planName, planFeatures, dashboardUrl, docsUrl, pioneerTier, pioneerPoints }) {
  const greeting = firstName ? `${firstName}, we received your request.` : "We received your request.";
  const previewText = `Welcome to Vreko${pioneerTier ? ` \xB7 Pioneer ${pioneerTier}` : ""}`;
  return /* @__PURE__ */ jsxs(VrekoEmailShell, {
    title: `Welcome to Vreko, ${firstName}`,
    previewText,
    children: [
      /* @__PURE__ */ jsx(Badge, {
        label: "Pioneer Cohort"
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          margin: "0 0 20px 0",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
          fontSize: "20px",
          lineHeight: "1.35",
          fontWeight: 600,
          color: "#FFFFFF",
          letterSpacing: "-0.01em"
        },
        children: greeting
      }),
      /* @__PURE__ */ jsxs(BodyText, {
        children: [
          "You're on the ",
          /* @__PURE__ */ jsx("strong", {
            children: planName
          }),
          " plan. Vreko is set up to watch your codebase locally, record what actually breaks, and write those signals back into AGENTS.md for the next session."
        ]
      }),
      /* @__PURE__ */ jsx(BodyText, {
        mb: 24,
        children: "No code leaves your machine. Intelligence compounds with each session, and your docs stay current as the daemon learns your workspace."
      }),
      /* @__PURE__ */ jsx(TerminalBlock, {
        cursor: true,
        children: [
          `plan: ${planName}`,
          pioneerTier ? `pioneer tier: ${pioneerTier}` : null,
          pioneerPoints !== void 0 ? `pioneer points: ${pioneerPoints}` : null
        ].filter(Boolean).join("\n")
      }),
      planFeatures.length > 0 ? /* @__PURE__ */ jsx(BodyText, {
        mt: 24,
        mb: 16,
        children: planFeatures.slice(0, 3).join(" \xB7 ")
      }) : null,
      /* @__PURE__ */ jsx(PrimaryButton2, {
        href: dashboardUrl,
        children: "Open Dashboard"
      }),
      /* @__PURE__ */ jsxs(BodyText, {
        mt: 8,
        mb: 0,
        children: [
          "Need the setup guide?",
          " ",
          /* @__PURE__ */ jsx("a", {
            href: docsUrl,
            style: {
              color: "#4ADE80",
              textDecoration: "none"
            },
            children: "Read the docs \u2192"
          })
        ]
      })
    ]
  });
}
__name(Welcome, "Welcome");
__name3(Welcome, "Welcome");
function WeMissYou({ firstName, lastActiveDate, daysInactive, totalSessions, totalTimelineRestores, pioneerTier, pioneerPoints, dashboardUrl, extensionUrl, feedbackUrl }) {
  return /* @__PURE__ */ jsxs(VrekoLayout, {
    title: "We Miss You!",
    preheader: `It's been ${daysInactive} days since your last Vreko session`,
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "offline"
      }),
      /* @__PURE__ */ jsxs(Section, {
        style: {
          padding: "32px 24px"
        },
        children: [
          /* @__PURE__ */ jsx(Heading, {
            style: {
              margin: "0 0 16px 0",
              fontSize: "24px",
              fontWeight: "600",
              color: emailTheme.colors.text,
              fontFamily: emailTheme.fonts.mono
            },
            children: "$ vreko status --last-seen"
          }),
          /* @__PURE__ */ jsxs(Text, {
            style: {
              margin: "0 0 24px 0",
              fontSize: "16px",
              lineHeight: "24px",
              color: emailTheme.colors.textSecondary,
              fontFamily: emailTheme.fonts.sans
            },
            children: [
              "Hey ",
              firstName,
              ", we noticed you haven't been around for a while. Your last session was on",
              " ",
              lastActiveDate,
              " - that's ",
              daysInactive,
              " days ago."
            ]
          }),
          /* @__PURE__ */ jsx(AlertBox, {
            type: "info",
            children: /* @__PURE__ */ jsx("span", {
              children: "Your Vreko account is still active and ready whenever you need it."
            })
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "32px 0",
              padding: "24px",
              backgroundColor: emailTheme.colors.surfaceSubtle,
              border: `1px solid ${emailTheme.colors.border}`,
              borderRadius: "8px"
            },
            children: [
              /* @__PURE__ */ jsx(Heading, {
                style: {
                  margin: "0 0 16px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.mono
                },
                children: "Your Vreko History"
              }),
              /* @__PURE__ */ jsx(StatRow, {
                label: "Total Sessions",
                value: totalSessions.toString(),
                icon: "\u{1F4F8}"
              }),
              /* @__PURE__ */ jsx(StatRow, {
                label: "Timeline Restores",
                value: totalTimelineRestores.toString(),
                icon: "\u23EA"
              }),
              pioneerTier && /* @__PURE__ */ jsx(StatRow, {
                label: "Pioneer Tier",
                value: pioneerTier,
                icon: "\u{1F680}"
              }),
              pioneerPoints !== void 0 && /* @__PURE__ */ jsx(StatRow, {
                label: "Pioneer Points",
                value: pioneerPoints.toString(),
                icon: "\u2B50"
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "32px 0"
            },
            children: [
              /* @__PURE__ */ jsx(Heading, {
                style: {
                  margin: "0 0 16px 0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.mono
                },
                children: "What's New Since You Left"
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "8px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  /* @__PURE__ */ jsx("span", {
                    style: {
                      color: emailTheme.colors.primary
                    },
                    children: "\u2728"
                  }),
                  " ",
                  /* @__PURE__ */ jsx("strong", {
                    children: "AutoDecisionEngine"
                  }),
                  " ",
                  "- Zero-config protection that learns your workflow"
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "8px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  /* @__PURE__ */ jsx("span", {
                    style: {
                      color: emailTheme.colors.primary
                    },
                    children: "\u2728"
                  }),
                  " ",
                  /* @__PURE__ */ jsx("strong", {
                    children: "Session Time-Travel"
                  }),
                  " - Atomic multi-file rollback for AI changes"
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "8px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  /* @__PURE__ */ jsx("span", {
                    style: {
                      color: emailTheme.colors.primary
                    },
                    children: "\u2728"
                  }),
                  " ",
                  /* @__PURE__ */ jsx("strong", {
                    children: "Faster Restores"
                  }),
                  " - One-click recovery, even faster than before"
                ]
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "8px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  /* @__PURE__ */ jsx("span", {
                    style: {
                      color: emailTheme.colors.primary
                    },
                    children: "\u2728"
                  }),
                  " ",
                  /* @__PURE__ */ jsx("strong", {
                    children: "Claude Code Support"
                  }),
                  " - Full support for Anthropic's new CLI"
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              textAlign: "center",
              margin: "32px 0"
            },
            children: [
              /* @__PURE__ */ jsx(PrimaryButton2, {
                href: dashboardUrl,
                children: "Return to Vreko"
              }),
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: "16px 0 0 0",
                  fontSize: "14px",
                  color: emailTheme.colors.textSecondary
                },
                children: [
                  "Need to",
                  " ",
                  /* @__PURE__ */ jsx(Link, {
                    href: extensionUrl,
                    style: {
                      color: emailTheme.colors.primary,
                      textDecoration: "none"
                    },
                    children: "reinstall the extension"
                  }),
                  "?"
                ]
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "32px 0",
              padding: "20px",
              backgroundColor: emailTheme.colors.surfaceSubtle,
              border: `1px solid ${emailTheme.colors.border}`,
              borderRadius: "8px"
            },
            children: [
              /* @__PURE__ */ jsx(Heading, {
                style: {
                  margin: "0 0 12px 0",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.mono
                },
                children: "Quick Reminder: How Vreko Helps"
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: 0,
                  fontSize: "14px",
                  lineHeight: "22px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: "Vreko automatically tracks sessions when AI tools edit your code. When Cursor, Copilot, or Claude Code makes changes you don't want, one click brings you back. No more manual git stashing or undo spam."
              })
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "32px 0 0 0",
              padding: "20px",
              backgroundColor: emailTheme.colors.backgroundSecondary,
              border: `1px solid ${emailTheme.colors.primary}`,
              borderRadius: "8px"
            },
            children: [
              /* @__PURE__ */ jsxs(Text, {
                style: {
                  margin: 0,
                  fontSize: "14px",
                  lineHeight: "22px",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.sans
                },
                children: [
                  /* @__PURE__ */ jsx("strong", {
                    style: {
                      color: emailTheme.colors.primary
                    },
                    children: "\u{1F4AC} We'd love your feedback"
                  }),
                  /* @__PURE__ */ jsx("br", {}),
                  /* @__PURE__ */ jsx("span", {
                    style: {
                      color: emailTheme.colors.textSecondary
                    },
                    children: "Is there something we could improve? A feature you wish we had? We're always listening."
                  })
                ]
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "12px 0 0 0",
                  fontSize: "13px"
                },
                children: /* @__PURE__ */ jsx(Link, {
                  href: feedbackUrl,
                  style: {
                    color: emailTheme.colors.primary,
                    textDecoration: "none"
                  },
                  children: "Share your feedback \u2192"
                })
              })
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(WeMissYou, "WeMissYou");
__name3(WeMissYou, "WeMissYou");
function VrekoLayout2({ title, preheader, children }) {
  return /* @__PURE__ */ jsxs(Html, {
    lang: "en",
    children: [
      /* @__PURE__ */ jsxs(Head, {
        children: [
          /* @__PURE__ */ jsx("meta", {
            name: "color-scheme",
            content: "light dark"
          }),
          /* @__PURE__ */ jsx("title", {
            children: title
          }),
          preheader && /* @__PURE__ */ jsx(Preview, {
            children: preheader
          })
        ]
      }),
      /* @__PURE__ */ jsx(Body, {
        style: {
          backgroundColor: emailTheme.colors.background,
          fontFamily: emailTheme.fonts.body,
          margin: 0,
          padding: 0
        },
        children: /* @__PURE__ */ jsx(Container, {
          style: {
            maxWidth: emailTheme.maxWidth,
            margin: "0 auto",
            padding: emailTheme.spacing["2xl"]
          },
          children: /* @__PURE__ */ jsx(Section, {
            children
          })
        })
      })
    ]
  });
}
__name(VrekoLayout2, "VrekoLayout2");
__name3(VrekoLayout2, "VrekoLayout");
function IssueResolved({ issueId, originalSubject, resolutionDescription, changelogUrl }) {
  return /* @__PURE__ */ jsxs(VrekoLayout2, {
    title: `Re: ${originalSubject}`,
    preheader: "Your issue has been resolved",
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "online"
      }),
      /* @__PURE__ */ jsxs(Section, {
        style: {
          padding: "32px 24px"
        },
        children: [
          /* @__PURE__ */ jsx(Heading, {
            style: {
              margin: "0 0 24px 0",
              fontSize: "24px",
              fontWeight: "600",
              color: emailTheme.colors.success,
              fontFamily: emailTheme.fonts.mono
            },
            children: "Issue resolved"
          }),
          /* @__PURE__ */ jsxs(Text, {
            style: {
              margin: "0 0 16px 0",
              fontSize: "16px",
              lineHeight: "24px",
              color: emailTheme.colors.textSecondary,
              fontFamily: emailTheme.fonts.sans
            },
            children: [
              "The issue you reported ( ",
              /* @__PURE__ */ jsx("strong", {
                style: {
                  color: emailTheme.colors.text
                },
                children: issueId
              }),
              ") has been resolved."
            ]
          }),
          resolutionDescription && /* @__PURE__ */ jsx(Text, {
            style: {
              margin: "16px 0",
              fontSize: "14px",
              lineHeight: "20px",
              color: emailTheme.colors.textTertiary,
              fontFamily: emailTheme.fonts.sans,
              padding: "16px",
              backgroundColor: emailTheme.colors.surfaceSubtle,
              borderRadius: "8px"
            },
            children: resolutionDescription
          }),
          /* @__PURE__ */ jsx(Text, {
            style: {
              margin: "24px 0 16px 0",
              fontSize: "16px",
              lineHeight: "24px",
              color: emailTheme.colors.textSecondary,
              fontFamily: emailTheme.fonts.sans
            },
            children: "Thanks for the report - this is exactly the kind of feedback that makes Vreko better for everyone."
          }),
          changelogUrl && /* @__PURE__ */ jsx(PrimaryButton2, {
            href: changelogUrl,
            children: "View Release Notes"
          })
        ]
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(IssueResolved, "IssueResolved");
__name3(IssueResolved, "IssueResolved");
function MCPTroubleshoot({ userName }) {
  const greeting = userName ? `Hi ${userName}` : "Hi there";
  return /* @__PURE__ */ jsxs(VrekoLayout2, {
    title: "Your MCP connection didn't complete",
    preheader: "Quick troubleshooting steps for MCP setup",
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "online"
      }),
      /* @__PURE__ */ jsxs(Section, {
        style: {
          padding: "32px 24px"
        },
        children: [
          /* @__PURE__ */ jsxs(Heading, {
            style: {
              margin: "0 0 24px 0",
              fontSize: "20px",
              fontWeight: "500",
              color: emailTheme.colors.text,
              fontFamily: emailTheme.fonts.sans
            },
            children: [
              greeting,
              ","
            ]
          }),
          /* @__PURE__ */ jsx(Text, {
            style: {
              margin: "0 0 16px 0",
              fontSize: "16px",
              lineHeight: "24px",
              color: emailTheme.colors.textSecondary,
              fontFamily: emailTheme.fonts.sans
            },
            children: "Looks like your MCP connection didn't complete. Here are the most common fixes:"
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "24px 0",
              padding: "20px",
              backgroundColor: emailTheme.colors.surfaceSubtle,
              borderRadius: "8px",
              border: `1px solid ${emailTheme.colors.border}`
            },
            children: [
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "0 0 12px 0",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.sans
                },
                children: "1. Check MCP Server Configuration"
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "0 0 20px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: "Ensure your IDE has MCP support enabled in settings."
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "0 0 12px 0",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.sans
                },
                children: "2. Verify API Key"
              }),
              /* @__PURE__ */ jsx(CodeBlock, {
                code: "$ vreko auth verify"
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "12px 0 20px 0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: "Run this to check your API key is valid."
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "0 0 12px 0",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.sans
                },
                children: "3. Restart Your IDE"
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "0",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: emailTheme.colors.textSecondary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: "Sometimes a simple restart refreshes the connection."
              })
            ]
          }),
          /* @__PURE__ */ jsx(Text, {
            style: {
              margin: "24px 0 16px 0",
              fontSize: "14px",
              lineHeight: "22px",
              color: emailTheme.colors.textTertiary,
              fontFamily: emailTheme.fonts.sans
            },
            children: "Need more help? Reply to this email and we'll get you sorted."
          }),
          /* @__PURE__ */ jsx(PrimaryButton2, {
            href: "https://docs.vreko.dev/mcp",
            children: "MCP Setup Guide"
          })
        ]
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(MCPTroubleshoot, "MCPTroubleshoot");
__name3(MCPTroubleshoot, "MCPTroubleshoot");
function PaymentFailed({ amount, currency, retryDate }) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase()
  }).format(amount);
  const formattedDate = new Date(retryDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
  return /* @__PURE__ */ jsxs(VrekoLayout2, {
    title: "Your Vreko payment didn't go through",
    preheader: "Update your payment method to keep Pro features active",
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "online"
      }),
      /* @__PURE__ */ jsxs(Section, {
        style: {
          padding: "32px 24px"
        },
        children: [
          /* @__PURE__ */ jsx(Heading, {
            style: {
              margin: "0 0 24px 0",
              fontSize: "20px",
              fontWeight: "500",
              color: emailTheme.colors.text,
              fontFamily: emailTheme.fonts.sans
            },
            children: "Your Vreko payment didn't go through"
          }),
          /* @__PURE__ */ jsxs(Text, {
            style: {
              margin: "0 0 16px 0",
              fontSize: "16px",
              lineHeight: "24px",
              color: emailTheme.colors.textSecondary,
              fontFamily: emailTheme.fonts.sans
            },
            children: [
              "Your card on file couldn't be charged (",
              formattedAmount,
              "). Update it to keep your Pro features active."
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "24px 0",
              padding: "20px",
              backgroundColor: emailTheme.colors.surfaceSubtle,
              borderRadius: "8px",
              border: `1px solid ${emailTheme.colors.border}`
            },
            children: [
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "0 0 8px 0",
                  fontSize: "14px",
                  color: emailTheme.colors.textTertiary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: "Next retry attempt"
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "0",
                  fontSize: "18px",
                  fontWeight: "600",
                  color: emailTheme.colors.text,
                  fontFamily: emailTheme.fonts.sans
                },
                children: formattedDate
              })
            ]
          }),
          /* @__PURE__ */ jsx(Text, {
            style: {
              margin: "24px 0 16px 0",
              fontSize: "14px",
              lineHeight: "22px",
              color: emailTheme.colors.textTertiary,
              fontFamily: emailTheme.fonts.sans
            },
            children: "No charges will be attempted until you update your payment method."
          }),
          /* @__PURE__ */ jsx(PrimaryButton2, {
            href: "https://console.vreko.dev/billing",
            children: "Update Payment Method"
          })
        ]
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(PaymentFailed, "PaymentFailed");
__name3(PaymentFailed, "PaymentFailed");
({
  previewProps: {
    retryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1e3).toISOString()
  }
});
function ReEngagement({ daysInactive, sessionCount, userName }) {
  const greeting = userName ? `Hi ${userName}` : "Hi there";
  return /* @__PURE__ */ jsxs(VrekoLayout2, {
    title: "Your codebase intelligence is paused",
    preheader: "Resume sessions to keep your intelligence up to date",
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "online"
      }),
      /* @__PURE__ */ jsxs(Section, {
        style: {
          padding: "32px 24px"
        },
        children: [
          /* @__PURE__ */ jsx(Heading, {
            style: {
              margin: "0 0 24px 0",
              fontSize: "22px",
              fontWeight: "500",
              color: emailTheme.colors.text,
              fontFamily: emailTheme.fonts.sans
            },
            children: "Your codebase intelligence is paused"
          }),
          /* @__PURE__ */ jsxs(Text, {
            style: {
              margin: "0 0 24px 0",
              fontSize: "16px",
              lineHeight: "26px",
              color: emailTheme.colors.textSecondary,
              fontFamily: emailTheme.fonts.sans
            },
            children: [
              greeting,
              ","
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            style: {
              margin: "0 0 16px 0",
              fontSize: "16px",
              lineHeight: "26px",
              color: emailTheme.colors.textSecondary,
              fontFamily: emailTheme.fonts.sans
            },
            children: [
              "Vreko learns from every session. It's been",
              " ",
              /* @__PURE__ */ jsxs("strong", {
                style: {
                  color: emailTheme.colors.warning
                },
                children: [
                  daysInactive,
                  " days"
                ]
              }),
              " since your last one - your intelligence is falling behind your codebase."
            ]
          }),
          /* @__PURE__ */ jsxs(Section, {
            style: {
              margin: "32px 0",
              padding: "24px",
              backgroundColor: emailTheme.colors.surfaceSubtle,
              borderRadius: "8px",
              border: `1px solid ${emailTheme.colors.border}`,
              textAlign: "center"
            },
            children: [
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "0 0 8px 0",
                  fontSize: "48px",
                  fontWeight: "700",
                  color: emailTheme.colors.primary,
                  fontFamily: emailTheme.fonts.mono
                },
                children: sessionCount
              }),
              /* @__PURE__ */ jsx(Text, {
                style: {
                  margin: "0",
                  fontSize: "14px",
                  color: emailTheme.colors.textTertiary,
                  fontFamily: emailTheme.fonts.sans
                },
                children: "sessions with Vreko"
              })
            ]
          }),
          /* @__PURE__ */ jsx(Text, {
            style: {
              margin: "24px 0 16px 0",
              fontSize: "14px",
              lineHeight: "22px",
              color: emailTheme.colors.textTertiary,
              fontFamily: emailTheme.fonts.sans
            },
            children: "Your patterns and insights are still there, waiting for the next session."
          }),
          /* @__PURE__ */ jsx(PrimaryButton2, {
            href: "https://vreko.dev/dashboard",
            children: "Resume Sessions"
          })
        ]
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(ReEngagement, "ReEngagement");
__name3(ReEngagement, "ReEngagement");
function SupportAutoReply({ issueId, originalSubject }) {
  return /* @__PURE__ */ jsxs(VrekoLayout2, {
    title: `Re: ${originalSubject}`,
    preheader: "Thanks for reaching out - we've received your support request",
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "online"
      }),
      /* @__PURE__ */ jsxs(Section, {
        style: {
          padding: "32px 24px"
        },
        children: [
          /* @__PURE__ */ jsx(Heading, {
            style: {
              margin: "0 0 24px 0",
              fontSize: "24px",
              fontWeight: "600",
              color: emailTheme.colors.primary,
              fontFamily: emailTheme.fonts.mono
            },
            children: "Thanks for reaching out"
          }),
          /* @__PURE__ */ jsxs(Text, {
            style: {
              margin: "0 0 16px 0",
              fontSize: "16px",
              lineHeight: "24px",
              color: emailTheme.colors.textSecondary,
              fontFamily: emailTheme.fonts.sans
            },
            children: [
              "We've logged this as ",
              /* @__PURE__ */ jsx("strong", {
                style: {
                  color: emailTheme.colors.text
                },
                children: issueId
              }),
              " and the team will follow up within 4 hours."
            ]
          }),
          /* @__PURE__ */ jsxs(Text, {
            style: {
              margin: "16px 0",
              fontSize: "14px",
              lineHeight: "20px",
              color: emailTheme.colors.textTertiary,
              fontFamily: emailTheme.fonts.sans
            },
            children: [
              "In the meantime, check",
              " ",
              /* @__PURE__ */ jsx("a", {
                href: "https://docs.vreko.dev",
                style: {
                  color: emailTheme.colors.primary,
                  textDecoration: "none"
                },
                children: "docs.vreko.dev"
              }),
              " ",
              "for common solutions."
            ]
          })
        ]
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(SupportAutoReply, "SupportAutoReply");
__name3(SupportAutoReply, "SupportAutoReply");
function TrialEnding({ daysRemaining, featuresUsed }) {
  return /* @__PURE__ */ jsxs(VrekoLayout2, {
    title: `Your Vreko trial ends in ${daysRemaining} days`,
    preheader: "What you've used and what you'll keep on Pro",
    children: [
      /* @__PURE__ */ jsx(TerminalHeader, {
        status: "online"
      }),
      /* @__PURE__ */ jsxs(Section, {
        style: {
          padding: "32px 24px"
        },
        children: [
          /* @__PURE__ */ jsxs(Heading, {
            style: {
              margin: "0 0 24px 0",
              fontSize: "20px",
              fontWeight: "500",
              color: emailTheme.colors.text,
              fontFamily: emailTheme.fonts.sans
            },
            children: [
              "Your Vreko trial ends in ",
              daysRemaining,
              " days"
            ]
          }),
          /* @__PURE__ */ jsx(Text, {
            style: {
              margin: "0 0 16px 0",
              fontSize: "16px",
              lineHeight: "24px",
              color: emailTheme.colors.textSecondary,
              fontFamily: emailTheme.fonts.sans
            },
            children: "Here's what you've used during your trial:"
          }),
          /* @__PURE__ */ jsx(Section, {
            style: {
              margin: "24px 0",
              padding: "20px",
              backgroundColor: emailTheme.colors.surfaceSubtle,
              borderRadius: "8px",
              border: `1px solid ${emailTheme.colors.border}`
            },
            children: featuresUsed.map((feature, index) => /* @__PURE__ */ jsxs(Text, {
              style: {
                margin: "8px 0",
                fontSize: "14px",
                lineHeight: "20px",
                color: emailTheme.colors.textSecondary,
                fontFamily: emailTheme.fonts.sans
              },
              children: [
                /* @__PURE__ */ jsx("span", {
                  style: {
                    color: emailTheme.colors.success
                  },
                  children: "\u2713"
                }),
                " ",
                feature
              ]
            }, index))
          }),
          /* @__PURE__ */ jsxs(Text, {
            style: {
              margin: "24px 0 16px 0",
              fontSize: "14px",
              lineHeight: "22px",
              color: emailTheme.colors.textSecondary,
              fontFamily: emailTheme.fonts.sans
            },
            children: [
              /* @__PURE__ */ jsx("strong", {
                style: {
                  color: emailTheme.colors.text
                },
                children: "On Free:"
              }),
              " Keep your patterns and continue with basic features.",
              /* @__PURE__ */ jsx("br", {}),
              /* @__PURE__ */ jsx("strong", {
                style: {
                  color: emailTheme.colors.primary
                },
                children: "On Pro:"
              }),
              " Keep everything plus unlimited sessions, advanced insights, and team collaboration."
            ]
          }),
          /* @__PURE__ */ jsx(Text, {
            style: {
              margin: "24px 0 16px 0",
              fontSize: "14px",
              lineHeight: "22px",
              color: emailTheme.colors.textTertiary,
              fontFamily: emailTheme.fonts.sans,
              fontStyle: "italic"
            },
            children: "No hard sell - just facts. Choose what works for you."
          }),
          /* @__PURE__ */ jsx(PrimaryButton2, {
            href: "https://vreko.dev/pricing",
            children: "View Plans"
          })
        ]
      }),
      /* @__PURE__ */ jsx(RepoFooter, {})
    ]
  });
}
__name(TrialEnding, "TrialEnding");
__name3(TrialEnding, "TrialEnding");
z.object({});
z.object({});
z.object({});
z.object({
  firstName: z.string(),
  recoveryRisk: z.number(),
  changeVolatility: z.number(),
  workflowFragility: z.number(),
  topFinding: z.string(),
  topAction: z.string(),
  hotspotCount: z.number(),
  filesWatched: z.number(),
  dashboardUrl: z.string().url()
});
z.object({
  email: z.string().email(),
  activationUrl: z.string().url(),
  cliSetupCommand: z.string().default("vreko auth set-key YOUR_KEY"),
  vscodeMarketplaceUrl: z.string().url().default("https://marketplace.visualstudio.com/items?itemName=Vreko.vreko")
});
function InviteDelivery({ email, activationUrl, cliSetupCommand, vscodeMarketplaceUrl }) {
  return jsxs(Wrapper, {
    preview: "Your Vreko invite is ready  -  activate your account to get started",
    children: [
      jsx(Heading, {
        style: {
          color: brand.textPrimary,
          fontSize: "28px",
          fontWeight: 700,
          margin: "0 0 8px"
        },
        children: "You're in \u{1F389}"
      }),
      jsx(Text, {
        style: {
          color: brand.textSecondary,
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 24px"
        },
        children: "Click below to activate your Vreko account and get your API key."
      }),
      jsx(PrimaryButton, {
        href: activationUrl,
        children: "Activate Your Account"
      }),
      jsxs(Section, {
        style: {
          backgroundColor: brand.surfaceElevated,
          borderRadius: "8px",
          padding: "20px",
          border: `1px solid ${brand.border}`,
          marginTop: "24px",
          marginBottom: "24px"
        },
        children: [
          jsx(Text, {
            style: {
              color: brand.textSecondary,
              fontSize: "12px",
              fontWeight: 600,
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            },
            children: "Once you activate, you'll get:"
          }),
          jsxs(Text, {
            style: {
              color: brand.textPrimary,
              fontSize: "14px",
              margin: "0 0 8px"
            },
            children: [
              jsx("span", {
                style: {
                  color: brand.primary,
                  marginRight: "8px"
                },
                children: "\u2713"
              }),
              "Your API key for the CLI and VS Code extension"
            ]
          }),
          jsxs(Text, {
            style: {
              color: brand.textPrimary,
              fontSize: "14px",
              margin: 0
            },
            children: [
              jsx("span", {
                style: {
                  color: brand.primary,
                  marginRight: "8px"
                },
                children: "\u2713"
              }),
              "Full access to Vreko's intelligence platform"
            ]
          })
        ]
      }),
      jsxs(Section, {
        style: {
          backgroundColor: brand.surfaceElevated,
          borderRadius: "8px",
          padding: "20px",
          border: `1px solid ${brand.border}`,
          marginBottom: "24px"
        },
        children: [
          jsx(Text, {
            style: {
              color: brand.textSecondary,
              fontSize: "12px",
              fontWeight: 600,
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            },
            children: "Quick setup"
          }),
          jsxs(Text, {
            style: {
              color: brand.textPrimary,
              fontSize: "13px",
              margin: "0 0 8px"
            },
            children: [
              jsx("strong", {
                style: {
                  color: brand.textSecondary
                },
                children: "CLI:"
              }),
              " ",
              jsx("code", {
                style: {
                  backgroundColor: brand.surface,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  fontSize: "12px"
                },
                children: cliSetupCommand
              })
            ]
          }),
          jsxs(Text, {
            style: {
              color: brand.textPrimary,
              fontSize: "13px",
              margin: 0
            },
            children: [
              jsx("strong", {
                style: {
                  color: brand.textSecondary
                },
                children: "VS Code:"
              }),
              " ",
              jsx("a", {
                href: vscodeMarketplaceUrl,
                style: {
                  color: brand.primary,
                  textDecoration: "none"
                },
                children: "Install from Marketplace"
              })
            ]
          })
        ]
      }),
      jsx(Hr, {
        style: {
          borderColor: brand.border,
          margin: "24px 0"
        }
      }),
      jsxs(Text, {
        style: {
          color: brand.textMuted,
          fontSize: "12px",
          margin: 0
        },
        children: [
          "Questions? Just reply to this email.",
          jsx("br", {}),
          " - Q"
        ]
      })
    ]
  });
}
__name(InviteDelivery, "InviteDelivery");
InviteDelivery.PreviewProps = {
  email: "dev@example.com",
  activationUrl: "https://console.vreko.dev/activate/ABC12XYZ",
  cliSetupCommand: "vreko auth set-key YOUR_KEY",
  vscodeMarketplaceUrl: "https://marketplace.visualstudio.com/items?itemName=Vreko.vreko"
};
({
  previewProps: InviteDelivery.PreviewProps});
var __defProp3 = Object.defineProperty;
var __name4 = /* @__PURE__ */ __name((target, value) => __defProp3(target, "name", {
  value,
  configurable: true
}), "__name");
var emailTheme2 = {
  colors: {
    // Backgrounds - Dark mode optimized
    background: "#0A0A0A",
    surface: "#111111",
    // Brand - Vreko Green (#4ADE80)
    primary: "#4ADE80",
    // Text - High contrast for email clients
    text: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#71717A",
    textDisabled: "#52525B",
    // UI Elements
    border: "#27272A",
    divider: "#27272A",
    // Semantic Colors
    success: "#34D399",
    error: "#EF4444",
    warning: "#FF6B35",
    info: "#3B82F6"
  },
  fonts: {
    mono: '"JetBrains Mono", "Fira Code", Consolas, Monaco, monospace'
  },
  fontSizes: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
    "2xl": "24px"
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px"
  },
  borderRadius: "4px",
  borderWidth: "1px"
};
function RepoFooter2() {
  const currentYear = /* @__PURE__ */ (/* @__PURE__ */ new Date()).getFullYear();
  return /* @__PURE__ */ jsxs(Section, {
    style: {
      borderTop: `${emailTheme2.borderWidth} solid ${emailTheme2.colors.border}`,
      paddingTop: emailTheme2.spacing.lg,
      marginTop: emailTheme2.spacing.xl
    },
    children: [
      /* @__PURE__ */ jsxs(Text, {
        style: {
          margin: 0,
          marginBottom: emailTheme2.spacing.sm,
          fontSize: emailTheme2.fontSizes.sm,
          color: emailTheme2.colors.textMuted,
          fontFamily: emailTheme2.fonts.mono
        },
        children: [
          "\u250C\u2500 Vreko \xA9 ",
          currentYear
        ]
      }),
      /* @__PURE__ */ jsxs(Text, {
        style: {
          margin: 0,
          marginBottom: emailTheme2.spacing.sm,
          fontSize: emailTheme2.fontSizes.sm,
          color: emailTheme2.colors.textMuted
        },
        children: [
          /* @__PURE__ */ jsx(Link, {
            href: "https://vreko.dev",
            style: {
              color: emailTheme2.colors.primary,
              textDecoration: "none"
            },
            children: "vreko.dev"
          }),
          " \u2022 ",
          /* @__PURE__ */ jsx(Link, {
            href: "https://vreko.dev/docs",
            style: {
              color: emailTheme2.colors.textSecondary,
              textDecoration: "none"
            },
            children: "Docs"
          }),
          " \u2022 ",
          /* @__PURE__ */ jsx(Link, {
            href: "https://github.com/vreko",
            style: {
              color: emailTheme2.colors.textSecondary,
              textDecoration: "none"
            },
            children: "GitHub"
          })
        ]
      }),
      /* @__PURE__ */ jsxs(Text, {
        style: {
          margin: 0,
          fontSize: emailTheme2.fontSizes.xs,
          color: emailTheme2.colors.textDisabled
        },
        children: [
          "You're receiving this email because you have a Vreko account.",
          " ",
          /* @__PURE__ */ jsx(Link, {
            href: "{{unsubscribeUrl}}",
            style: {
              color: emailTheme2.colors.textMuted,
              textDecoration: "underline"
            },
            children: "Unsubscribe"
          })
        ]
      })
    ]
  });
}
__name(RepoFooter2, "RepoFooter");
__name4(RepoFooter2, "RepoFooter");
function TerminalHeader2({ status = "online" }) {
  const statusColors = {
    online: emailTheme2.colors.success,
    processing: emailTheme2.colors.warning,
    offline: emailTheme2.colors.textMuted,
    critical: emailTheme2.colors.error,
    degraded: emailTheme2.colors.warning
  };
  const statusText = {
    online: "\u25CF CONNECTED",
    processing: "\u25CB PROCESSING",
    offline: "\u25CB OFFLINE",
    critical: "\u25CF CRITICAL",
    degraded: "\u25CB DEGRADED"
  };
  return /* @__PURE__ */ jsx(Section, {
    style: {
      borderBottom: `${emailTheme2.borderWidth} solid ${emailTheme2.colors.border}`,
      paddingBottom: emailTheme2.spacing.lg,
      marginBottom: emailTheme2.spacing.xl
    },
    children: /* @__PURE__ */ jsx("table", {
      width: "100%",
      style: {
        width: "100%"
      },
      children: /* @__PURE__ */ jsxs("tr", {
        children: [
          /* @__PURE__ */ jsx("td", {
            style: {
              verticalAlign: "middle"
            },
            children: /* @__PURE__ */ jsxs(Heading, {
              style: {
                margin: 0,
                fontSize: emailTheme2.fontSizes["2xl"],
                fontWeight: 600,
                color: emailTheme2.colors.text,
                fontFamily: emailTheme2.fonts.mono
              },
              children: [
                /* @__PURE__ */ jsx("span", {
                  style: {
                    color: emailTheme2.colors.primary
                  },
                  children: "$"
                }),
                " Vreko"
              ]
            })
          }),
          /* @__PURE__ */ jsx("td", {
            style: {
              textAlign: "right",
              verticalAlign: "middle"
            },
            children: /* @__PURE__ */ jsx(Text, {
              style: {
                margin: 0,
                fontSize: emailTheme2.fontSizes.xs,
                color: statusColors[status],
                fontFamily: emailTheme2.fonts.mono,
                letterSpacing: "0.5px"
              },
              children: statusText[status]
            })
          })
        ]
      })
    })
  });
}
__name(TerminalHeader2, "TerminalHeader");
__name4(TerminalHeader2, "TerminalHeader");
var COLORS2 = {
  bg: "#0D1117",
  text: "#FFFFFF",
  muted: "#9CA3AF",
  green: "#4ADE80",
  border: "#27272A",
  footer: "#6B7280"
};
var FONT_BODY2 = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
var FONT_MONO2 = "'Geist Mono', 'SF Mono', ui-monospace, 'Courier New', Courier, monospace";
var bodyStyle2 = {
  margin: 0,
  padding: 0,
  backgroundColor: COLORS2.bg,
  color: COLORS2.text,
  fontFamily: FONT_BODY2,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale"
};
var containerStyle2 = {
  width: "100%",
  maxWidth: "560px",
  margin: "0 auto",
  backgroundColor: COLORS2.bg
};
var sectionStyle2 = {
  padding: "0 40px"
};
var headerStyle2 = {
  padding: "48px 40px 0 40px"
};
var footerStyle2 = {
  padding: "24px 40px 48px 40px",
  fontFamily: FONT_BODY2,
  fontSize: "11px",
  lineHeight: "1.6",
  color: COLORS2.footer
};
var hrStyle2 = {
  borderTop: `1px solid ${COLORS2.border}`,
  borderRight: "none",
  borderBottom: "none",
  borderLeft: "none",
  margin: "24px 0",
  width: "100%"
};
var footerLinkStyle2 = {
  color: COLORS2.green,
  textDecoration: "none"
};
function VrekoEmailShell2({ title = "Vreko", previewText, children, logoUrl = "https://vreko.dev/images/gecko-green.png" }) {
  return /* @__PURE__ */ jsxs(Html, {
    lang: "en",
    dir: "ltr",
    children: [
      /* @__PURE__ */ jsxs(Head, {
        children: [
          /* @__PURE__ */ jsx("meta", {
            charSet: "utf-8"
          }),
          /* @__PURE__ */ jsx("meta", {
            name: "viewport",
            content: "width=device-width, initial-scale=1"
          }),
          /* @__PURE__ */ jsx("meta", {
            httpEquiv: "X-UA-Compatible",
            content: "IE=edge"
          }),
          /* @__PURE__ */ jsx("meta", {
            name: "x-apple-disable-message-reformatting"
          }),
          /* @__PURE__ */ jsx("meta", {
            name: "format-detection",
            content: "telephone=no, date=no, address=no, email=no"
          }),
          /* @__PURE__ */ jsx("meta", {
            name: "color-scheme",
            content: "dark"
          }),
          /* @__PURE__ */ jsx("meta", {
            name: "supported-color-schemes",
            content: "dark"
          }),
          /* @__PURE__ */ jsx("title", {
            children: title
          }),
          /* @__PURE__ */ jsx(Font, {
            fontFamily: "Inter",
            fallbackFontFamily: [
              "Helvetica",
              "Arial",
              "sans-serif"
            ],
            webFont: {
              url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2",
              format: "woff2"
            },
            fontWeight: 400,
            fontStyle: "normal"
          }),
          /* @__PURE__ */ jsx(Font, {
            fontFamily: "Inter",
            fallbackFontFamily: [
              "Helvetica",
              "Arial",
              "sans-serif"
            ],
            webFont: {
              url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa05L7.woff2",
              format: "woff2"
            },
            fontWeight: 600,
            fontStyle: "normal"
          }),
          /* @__PURE__ */ jsx("style", {
            children: `
          :root { color-scheme: dark; supported-color-schemes: dark; }
          [data-ogsc] body, [data-ogsb] body { background-color: ${COLORS2.bg} !important; }
          [data-ogsc] .vreko-bg, [data-ogsb] .vreko-bg { background-color: ${COLORS2.bg} !important; }
          [data-ogsc] .vreko-fg, [data-ogsb] .vreko-fg { color: ${COLORS2.text} !important; }
          [data-ogsc] .vreko-muted, [data-ogsb] .vreko-muted { color: ${COLORS2.muted} !important; }
          [data-ogsc] .vreko-green, [data-ogsb] .vreko-green { color: ${COLORS2.green} !important; }
        `
          })
        ]
      }),
      /* @__PURE__ */ jsx(Preview, {
        children: previewText
      }),
      /* @__PURE__ */ jsx(Body, {
        style: bodyStyle2,
        className: "vreko-bg",
        children: /* @__PURE__ */ jsx("table", {
          role: "presentation",
          width: "100%",
          cellPadding: 0,
          cellSpacing: 0,
          border: 0,
          style: {
            backgroundColor: COLORS2.bg,
            width: "100%"
          },
          className: "vreko-bg",
          children: /* @__PURE__ */ jsx("tbody", {
            children: /* @__PURE__ */ jsx("tr", {
              children: /* @__PURE__ */ jsx("td", {
                align: "center",
                style: {
                  backgroundColor: COLORS2.bg
                },
                children: /* @__PURE__ */ jsxs(Container, {
                  style: containerStyle2,
                  className: "vreko-bg",
                  children: [
                    /* @__PURE__ */ jsx(Section, {
                      style: headerStyle2,
                      children: /* @__PURE__ */ jsx(Img, {
                        src: logoUrl,
                        alt: "Vreko",
                        width: "32",
                        height: "32",
                        style: {
                          display: "block",
                          width: "32px",
                          height: "32px",
                          border: 0,
                          outline: "none",
                          textDecoration: "none"
                        }
                      })
                    }),
                    /* @__PURE__ */ jsx(Section, {
                      style: sectionStyle2,
                      children: /* @__PURE__ */ jsx("hr", {
                        style: hrStyle2
                      })
                    }),
                    /* @__PURE__ */ jsx(Section, {
                      style: sectionStyle2,
                      children
                    }),
                    /* @__PURE__ */ jsx(Section, {
                      style: sectionStyle2,
                      children: /* @__PURE__ */ jsx("hr", {
                        style: hrStyle2
                      })
                    }),
                    /* @__PURE__ */ jsx(Section, {
                      style: footerStyle2,
                      children: /* @__PURE__ */ jsxs("p", {
                        style: {
                          margin: 0,
                          fontSize: "11px",
                          lineHeight: "1.6",
                          color: COLORS2.footer,
                          fontFamily: FONT_BODY2
                        },
                        className: "vreko-muted",
                        children: [
                          "Vreko by Marcelle Labs \xB7 Built on the",
                          " ",
                          /* @__PURE__ */ jsx("a", {
                            href: "https://workspacejson.dev",
                            style: footerLinkStyle2,
                            className: "vreko-green",
                            children: "workspace.json"
                          }),
                          " ",
                          "open standard"
                        ]
                      })
                    })
                  ]
                })
              })
            })
          })
        })
      })
    ]
  });
}
__name(VrekoEmailShell2, "VrekoEmailShell");
__name4(VrekoEmailShell2, "VrekoEmailShell");
var VREKO_COLORS2 = COLORS2;
var VREKO_FONT_BODY2 = FONT_BODY2;
var VREKO_FONT_MONO2 = FONT_MONO2;
function VrekoLayout3({ title, preheader, children }) {
  return /* @__PURE__ */ jsx(VrekoEmailShell2, {
    title,
    previewText: preheader ?? title,
    children
  });
}
__name(VrekoLayout3, "VrekoLayout");
__name4(VrekoLayout3, "VrekoLayout");
function AlertBox2({ type, children }) {
  const colorMap = {
    info: emailTheme2.colors.info,
    success: emailTheme2.colors.success,
    warning: emailTheme2.colors.warning,
    error: emailTheme2.colors.error
  };
  const iconMap = {
    info: "\u2139",
    success: "\u2713",
    warning: "\u26A0",
    error: "\u2715"
  };
  const backgroundColor = colorMap[type];
  const icon = iconMap[type];
  return /* @__PURE__ */ jsx(Section, {
    style: {
      backgroundColor: `${backgroundColor}15`,
      border: `${emailTheme2.borderWidth} solid ${backgroundColor}`,
      borderRadius: emailTheme2.borderRadius,
      padding: emailTheme2.spacing.md,
      margin: `${emailTheme2.spacing.lg} 0`
    },
    children: /* @__PURE__ */ jsxs(Text, {
      style: {
        margin: 0,
        color: emailTheme2.colors.text,
        fontSize: emailTheme2.fontSizes.base
      },
      children: [
        /* @__PURE__ */ jsx("span", {
          style: {
            color: backgroundColor,
            marginRight: emailTheme2.spacing.sm,
            fontWeight: 600
          },
          children: icon
        }),
        children
      ]
    })
  });
}
__name(AlertBox2, "AlertBox");
__name4(AlertBox2, "AlertBox");
function Badge2({ label }) {
  return /* @__PURE__ */ jsx(Text, {
    style: {
      margin: "0 0 20px 0",
      fontFamily: VREKO_FONT_MONO2,
      fontSize: "11px",
      lineHeight: 1,
      color: VREKO_COLORS2.green,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      fontWeight: 600
    },
    children: label
  });
}
__name(Badge2, "Badge");
__name4(Badge2, "Badge");
function BodyText2({ children, mt = 0, mb = 16 }) {
  return /* @__PURE__ */ jsx(Text, {
    style: {
      margin: `${mt}px 0 ${mb}px 0`,
      fontFamily: VREKO_FONT_BODY2,
      fontSize: "14px",
      lineHeight: 1.6,
      color: VREKO_COLORS2.muted,
      fontWeight: 400
    },
    children
  });
}
__name(BodyText2, "BodyText");
__name4(BodyText2, "BodyText");
function CodeBlock2({ code, copyable = false, webViewUrl, language }) {
  return /* @__PURE__ */ jsxs(Section, {
    style: {
      backgroundColor: emailTheme2.colors.surface,
      border: `${emailTheme2.borderWidth} solid ${emailTheme2.colors.border}`,
      borderRadius: emailTheme2.borderRadius,
      padding: emailTheme2.spacing.md,
      margin: `${emailTheme2.spacing.lg} 0`
    },
    children: [
      copyable && webViewUrl && /* @__PURE__ */ jsxs("div", {
        style: {
          marginBottom: emailTheme2.spacing.sm,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        },
        children: [
          /* @__PURE__ */ jsx(Text, {
            style: {
              margin: 0,
              fontSize: emailTheme2.fontSizes.xs,
              color: emailTheme2.colors.textMuted,
              fontFamily: emailTheme2.fonts.mono
            },
            children: language || "code"
          }),
          /* @__PURE__ */ jsx(Link, {
            href: webViewUrl,
            style: {
              fontSize: emailTheme2.fontSizes.xs,
              color: emailTheme2.colors.primary,
              textDecoration: "none"
            },
            children: "View & Copy \u2192"
          })
        ]
      }),
      /* @__PURE__ */ jsx(Text, {
        style: {
          fontFamily: emailTheme2.fonts.mono,
          fontSize: emailTheme2.fontSizes.sm,
          color: emailTheme2.colors.text,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          margin: 0
        },
        children: code
      })
    ]
  });
}
__name(CodeBlock2, "CodeBlock");
__name4(CodeBlock2, "CodeBlock");
function Headline2({ children }) {
  return /* @__PURE__ */ jsx(Heading, {
    as: "h1",
    style: {
      margin: "0 0 20px 0",
      fontFamily: VREKO_FONT_BODY2,
      fontSize: "20px",
      lineHeight: "1.35",
      fontWeight: 600,
      color: VREKO_COLORS2.text,
      textAlign: "left",
      letterSpacing: "-0.01em"
    },
    children
  });
}
__name(Headline2, "Headline");
__name4(Headline2, "Headline");
function PrimaryButton3({ href, children }) {
  return /* @__PURE__ */ jsx(Button, {
    href,
    style: {
      backgroundColor: emailTheme2.colors.primary,
      color: emailTheme2.colors.background,
      padding: `${emailTheme2.spacing.md} ${emailTheme2.spacing.xl}`,
      borderRadius: emailTheme2.borderRadius,
      textDecoration: "none",
      fontWeight: 600,
      fontSize: emailTheme2.fontSizes.base,
      display: "inline-block",
      margin: `${emailTheme2.spacing.lg} 0`,
      border: "none",
      cursor: "pointer"
    },
    children
  });
}
__name(PrimaryButton3, "PrimaryButton");
__name4(PrimaryButton3, "PrimaryButton");
function StatRow2({ label, value, unit, icon }) {
  return /* @__PURE__ */ jsx(Section, {
    style: {
      borderBottom: `${emailTheme2.borderWidth} solid ${emailTheme2.colors.divider}`,
      padding: `${emailTheme2.spacing.sm} 0`
    },
    children: /* @__PURE__ */ jsx("table", {
      width: "100%",
      style: {
        width: "100%"
      },
      children: /* @__PURE__ */ jsxs("tr", {
        children: [
          /* @__PURE__ */ jsx("td", {
            style: {
              width: "50%",
              verticalAlign: "middle"
            },
            children: /* @__PURE__ */ jsxs(Text, {
              style: {
                margin: 0,
                fontSize: emailTheme2.fontSizes.sm,
                color: emailTheme2.colors.textSecondary,
                fontFamily: emailTheme2.fonts.mono
              },
              children: [
                icon && /* @__PURE__ */ jsx("span", {
                  style: {
                    marginRight: "8px"
                  },
                  children: icon
                }),
                label
              ]
            })
          }),
          /* @__PURE__ */ jsx("td", {
            style: {
              width: "50%",
              textAlign: "right",
              verticalAlign: "middle"
            },
            children: /* @__PURE__ */ jsxs(Text, {
              style: {
                margin: 0,
                fontSize: emailTheme2.fontSizes.lg,
                color: emailTheme2.colors.primary,
                fontFamily: emailTheme2.fonts.mono,
                fontWeight: 600
              },
              children: [
                value,
                unit && /* @__PURE__ */ jsx("span", {
                  style: {
                    fontSize: emailTheme2.fontSizes.sm,
                    color: emailTheme2.colors.textMuted,
                    marginLeft: emailTheme2.spacing.xs
                  },
                  children: unit
                })
              ]
            })
          })
        ]
      })
    })
  });
}
__name(StatRow2, "StatRow");
__name4(StatRow2, "StatRow");
var TERMINAL_BG2 = "#111827";
var wrapStyle2 = {
  width: "100%",
  margin: "0 0 24px 0",
  backgroundColor: TERMINAL_BG2,
  borderRadius: "8px",
  border: `1px solid ${VREKO_COLORS2.border}`
};
var cellStyle2 = {
  padding: "16px 20px",
  fontFamily: VREKO_FONT_MONO2,
  fontSize: "12px",
  lineHeight: 1.8,
  color: VREKO_COLORS2.green,
  whiteSpace: "pre-wrap"
};
function TerminalBlock2({ children, cursor = false }) {
  return /* @__PURE__ */ jsx(Section, {
    style: wrapStyle2,
    children: /* @__PURE__ */ jsxs(Text, {
      style: cellStyle2,
      children: [
        children,
        cursor ? /* @__PURE__ */ jsx("span", {
          style: {
            color: VREKO_COLORS2.green
          },
          children: "_"
        }) : null
      ]
    })
  });
}
__name(TerminalBlock2, "TerminalBlock");
__name4(TerminalBlock2, "TerminalBlock");
z.object({
  email: z.string().email(),
  recipientName: z.string().optional(),
  cohortSize: z.number().int().positive().optional(),
  daemonStatus: z.string().optional(),
  logoUrl: z.string().url().optional()
});
function PioneerConfirmation({ email, recipientName, cohortSize = 50, daemonStatus = "intelligence CALIBRATING for your codebase", logoUrl }) {
  const greeting = recipientName ? `${recipientName}, we received your request.` : "We received your request.";
  const previewText = `We received your Pioneer cohort request${email ? ` for ${email}` : ""}`;
  return jsxs(VrekoEmailShell2, {
    previewText,
    logoUrl,
    children: [
      jsx(Badge2, {
        label: "Pioneer Cohort"
      }),
      jsx(Headline2, {
        children: greeting
      }),
      jsxs(BodyText2, {
        children: [
          "We're selecting ",
          cohortSize,
          " engineering teams for early access. You'll hear from us directly when we're ready to onboard your team."
        ]
      }),
      jsx(BodyText2, {
        mb: 24,
        children: "No marketing list. No drip sequence. The next email you receive from this address will either be an onboarding invite or a status update from the daemon."
      }),
      jsx(TerminalBlock2, {
        cursor: true,
        children: daemonStatus
      })
    ]
  });
}
__name(PioneerConfirmation, "PioneerConfirmation");
PioneerConfirmation.PreviewProps = {
  email: "alex@acme.dev",
  recipientName: "Alex",
  cohortSize: 50,
  daemonStatus: "intelligence CALIBRATING for your codebase"
};
({
  previewProps: PioneerConfirmation.PreviewProps});
z.object({
  firstName: z.string(),
  oldTier: z.string(),
  newTier: z.string(),
  pointsEarned: z.number(),
  totalPoints: z.number(),
  nextTierName: z.string().optional(),
  pointsToNextTier: z.number().optional(),
  unlockedPerks: z.array(z.object({
    icon: z.string(),
    name: z.string(),
    description: z.string()
  })),
  dashboardUrl: z.string().url()
});
function PioneerMilestone2({ firstName, oldTier, newTier, pointsEarned, totalPoints, nextTierName, pointsToNextTier, unlockedPerks, dashboardUrl }) {
  const progressPct = nextTierName && pointsToNextTier ? Math.min(100, Math.round(totalPoints / (totalPoints + pointsToNextTier) * 100)) : 100;
  return jsxs(Wrapper, {
    preview: "New perks unlocked  -  see what you've earned",
    children: [
      jsx(Heading, {
        style: {
          color: brand.primary,
          fontSize: "28px",
          fontWeight: 700,
          margin: "0 0 8px"
        },
        children: "\u{1F98E} Pioneer tier unlocked!"
      }),
      jsxs(Text, {
        style: {
          color: brand.textSecondary,
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 24px"
        },
        children: [
          firstName,
          ", you've leveled up from ",
          jsx("strong", {
            style: {
              color: brand.textPrimary
            },
            children: oldTier
          }),
          " to",
          " ",
          jsx("strong", {
            style: {
              color: brand.primary
            },
            children: newTier
          }),
          " in the Vreko Pioneer Program. You earned",
          " ",
          pointsEarned,
          " points this session."
        ]
      }),
      jsxs(Section, {
        style: {
          backgroundColor: brand.surfaceElevated,
          borderRadius: "8px",
          padding: "20px",
          border: `1px solid ${brand.primary}`,
          marginBottom: "24px",
          textAlign: "center"
        },
        children: [
          jsx(Text, {
            style: {
              color: brand.primary,
              fontSize: "32px",
              margin: "0 0 4px"
            },
            children: "\u{1F98E}"
          }),
          jsxs(Text, {
            style: {
              color: brand.primary,
              fontSize: "20px",
              fontWeight: 700,
              margin: "0 0 4px"
            },
            children: [
              newTier,
              " Pioneer"
            ]
          }),
          jsxs(Text, {
            style: {
              color: brand.textMuted,
              fontSize: "13px",
              margin: 0
            },
            children: [
              totalPoints.toLocaleString(),
              " total points"
            ]
          })
        ]
      }),
      unlockedPerks.length > 0 && jsxs(Fragment, {
        children: [
          jsx(Text, {
            style: {
              color: brand.textSecondary,
              fontSize: "13px",
              fontWeight: 600,
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            },
            children: "Perks unlocked"
          }),
          unlockedPerks.map((perk, i) => jsx(Section, {
            style: {
              backgroundColor: brand.surfaceElevated,
              borderRadius: "6px",
              padding: "14px 16px",
              border: `1px solid ${brand.border}`,
              marginBottom: "8px"
            },
            children: jsx("table", {
              style: {
                width: "100%",
                borderCollapse: "collapse"
              },
              children: jsx("tbody", {
                children: jsxs("tr", {
                  children: [
                    jsx("td", {
                      style: {
                        width: "36px",
                        verticalAlign: "top",
                        fontSize: "20px",
                        paddingTop: "2px"
                      },
                      children: perk.icon
                    }),
                    jsxs("td", {
                      children: [
                        jsx(Text, {
                          style: {
                            color: brand.textPrimary,
                            fontSize: "14px",
                            fontWeight: 600,
                            margin: "0 0 2px"
                          },
                          children: perk.name
                        }),
                        jsx(Text, {
                          style: {
                            color: brand.textMuted,
                            fontSize: "12px",
                            margin: 0
                          },
                          children: perk.description
                        })
                      ]
                    })
                  ]
                })
              })
            })
          }, i))
        ]
      }),
      nextTierName && pointsToNextTier && jsxs(Section, {
        style: {
          marginTop: "24px",
          marginBottom: "24px"
        },
        children: [
          jsx("table", {
            style: {
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "6px"
            },
            children: jsx("tbody", {
              children: jsxs("tr", {
                children: [
                  jsxs("td", {
                    style: {
                      color: brand.textMuted,
                      fontSize: "12px"
                    },
                    children: [
                      "Progress to ",
                      nextTierName
                    ]
                  }),
                  jsxs("td", {
                    style: {
                      color: brand.textMuted,
                      fontSize: "12px",
                      textAlign: "right"
                    },
                    children: [
                      pointsToNextTier,
                      " pts to go"
                    ]
                  })
                ]
              })
            })
          }),
          jsx("table", {
            style: {
              width: "100%",
              borderCollapse: "collapse"
            },
            children: jsx("tbody", {
              children: jsx("tr", {
                children: jsx("td", {
                  children: jsx("div", {
                    style: {
                      backgroundColor: brand.surfaceElevated,
                      borderRadius: "4px",
                      height: "8px",
                      overflow: "hidden"
                    },
                    children: jsx("div", {
                      style: {
                        backgroundColor: brand.primary,
                        height: "8px",
                        width: `${progressPct}%`,
                        borderRadius: "4px"
                      }
                    })
                  })
                })
              })
            })
          })
        ]
      }),
      jsx(PrimaryButton, {
        href: dashboardUrl,
        children: "View Pioneer Dashboard"
      }),
      jsx(Hr, {
        style: {
          borderColor: brand.border,
          margin: "24px 0"
        }
      }),
      jsx(Text, {
        style: {
          color: brand.textMuted,
          fontSize: "12px",
          margin: 0
        },
        children: "Keep shipping to earn more points and unlock the next tier."
      })
    ]
  });
}
__name(PioneerMilestone2, "PioneerMilestone");
PioneerMilestone2.PreviewProps = {
  firstName: "Alex",
  oldTier: "Silver",
  newTier: "Gold",
  pointsEarned: 150,
  totalPoints: 850,
  nextTierName: "Platinum",
  pointsToNextTier: 150,
  unlockedPerks: [
    {
      icon: "\u26A1",
      name: "Priority Intelligence",
      description: "Faster AI briefings for every session"
    },
    {
      icon: "\u{1F6E1}\uFE0F",
      name: "Extended Snapshot History",
      description: "90-day snapshot retention (up from 30)"
    },
    {
      icon: "\u{1F511}",
      name: "Beta Access",
      description: "Early access to all new features"
    }
  ],
  dashboardUrl: "https://vreko.dev/dashboard/pioneer"
};
({
  previewProps: PioneerMilestone2.PreviewProps});
z.object({
  headline: z.string().optional(),
  items: z.array(z.object({
    tag: z.string(),
    title: z.string(),
    description: z.string()
  })),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().url().optional(),
  logoUrl: z.string().url().optional()
});
function PioneerUpdate({ headline, items, ctaLabel, ctaHref, logoUrl }) {
  return jsxs(VrekoEmailShell2, {
    previewText: "Pioneer cohort update  -  what we shipped this week.",
    logoUrl,
    children: [
      jsx(Badge2, {
        label: "Pioneer Update"
      }),
      jsx(Headline2, {
        children: headline ?? "Here's what changed since you requested access."
      }),
      jsx(BodyText2, {
        mb: 8,
        children: "A short report from the daemon. We ship in public; this is what landed."
      }),
      jsx(Section, {
        style: {
          marginTop: "16px",
          marginBottom: "16px"
        },
        children: items.map((item, index) => jsxs(Section, {
          style: {
            padding: "20px 0",
            borderBottom: index === items.length - 1 ? "none" : "1px solid #27272A"
          },
          children: [
            jsx(Text, {
              style: {
                margin: "0 0 6px 0",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "11px",
                color: "#4ADE80",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 500
              },
              children: item.tag
            }),
            jsx(Text, {
              style: {
                margin: "0 0 6px 0",
                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "#FFFFFF",
                lineHeight: 1.4
              },
              children: item.title
            }),
            jsx(Text, {
              style: {
                margin: 0,
                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
                fontSize: "13px",
                color: "#9CA3AF",
                lineHeight: 1.6
              },
              children: item.description
            })
          ]
        }, `${item.tag}-${item.title}-${index}`))
      }),
      jsx(PrimaryButton3, {
        href: ctaHref ?? "https://workspacejson.dev/changelog",
        children: ctaLabel ?? "Read the full changelog"
      })
    ]
  });
}
__name(PioneerUpdate, "PioneerUpdate");
PioneerUpdate.PreviewProps = {
  headline: "Here's what changed since you requested access.",
  items: [
    {
      tag: "NEW",
      title: "Canonical Pioneer email templates are now wired",
      description: "The cohort now gets the same dark shell and gecko mark across every lifecycle email."
    },
    {
      tag: "FIXED",
      title: "Fragile file alerts now hide the file path on Free",
      description: "Pro unlocks the full intelligence card while the base tier stays useful and sparse."
    }
  ],
  ctaLabel: "Read the full changelog",
  ctaHref: "https://workspacejson.dev/changelog"
};
({
  previewProps: PioneerUpdate.PreviewProps});
z.object({
  firstName: z.string(),
  previousPosition: z.number(),
  currentPosition: z.number(),
  actionCompleted: z.string(),
  pointsEarned: z.number(),
  totalPoints: z.number(),
  pioneerUrl: z.string().url()
});
z.object({
  firstName: z.string(),
  daysSinceLastActive: z.number(),
  recentCommitCount: z.number(),
  newHotspotCount: z.number(),
  topChangedFile: z.string().optional(),
  dashboardUrl: z.string().url()
});
z.object({
  firstName: z.string(),
  referredName: z.string().optional(),
  pointsEarned: z.number(),
  totalPoints: z.number(),
  newQueuePosition: z.number(),
  totalReferrals: z.number(),
  pioneerUrl: z.string().url()
});
z.object({
  title: z.string(),
  message: z.string(),
  severity: z.enum([
    "critical",
    "warning",
    "info"
  ]),
  actionRequired: z.boolean(),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().optional(),
  additionalDetails: z.string().optional(),
  timestamp: z.string()
});
var severityConfig = {
  critical: {
    color: brand.danger,
    label: "CRITICAL"
  },
  warning: {
    color: brand.warning,
    label: "WARNING"
  },
  info: {
    color: brand.info,
    label: "INFO"
  }
};
function SystemAlert2({ title, message, severity, actionRequired, actionUrl, actionLabel, additionalDetails, timestamp }) {
  const config2 = severityConfig[severity];
  return jsxs(Wrapper, {
    preview: message.slice(0, 90),
    children: [
      jsxs(Section, {
        style: {
          borderLeft: `4px solid ${config2.color}`,
          paddingLeft: "16px",
          marginBottom: "24px"
        },
        children: [
          jsx(Text, {
            style: {
              color: config2.color,
              fontSize: "11px",
              fontWeight: 700,
              margin: "0 0 4px",
              textTransform: "uppercase",
              letterSpacing: "0.1em"
            },
            children: config2.label
          }),
          jsx(Heading, {
            style: {
              color: brand.textPrimary,
              fontSize: "22px",
              fontWeight: 700,
              margin: "0 0 8px"
            },
            children: title
          }),
          jsx(Text, {
            style: {
              color: brand.textSecondary,
              fontSize: "14px",
              lineHeight: "1.6",
              margin: 0
            },
            children: message
          })
        ]
      }),
      additionalDetails && jsx(Section, {
        style: {
          backgroundColor: brand.surfaceElevated,
          borderRadius: "6px",
          padding: "16px",
          border: `1px solid ${brand.border}`,
          marginBottom: "24px"
        },
        children: jsx(Text, {
          style: {
            color: brand.textSecondary,
            fontSize: "13px",
            lineHeight: "1.6",
            margin: 0,
            fontFamily: "monospace"
          },
          children: additionalDetails
        })
      }),
      actionRequired && actionUrl && actionLabel && jsx(PrimaryButton, {
        href: actionUrl,
        children: actionLabel
      }),
      jsx(Hr, {
        style: {
          borderColor: brand.border,
          margin: "24px 0"
        }
      }),
      jsxs(Text, {
        style: {
          color: brand.textMuted,
          fontSize: "12px",
          margin: 0
        },
        children: [
          "Sent at ",
          timestamp
        ]
      })
    ]
  });
}
__name(SystemAlert2, "SystemAlert");
SystemAlert2.PreviewProps = {
  title: "Snapshot Protection Degraded",
  message: "The Vreko daemon has not been responding for 5 minutes. Your code changes are not being protected during this time.",
  severity: "critical",
  actionRequired: true,
  actionUrl: "https://vreko.dev/dashboard/status",
  actionLabel: "Check System Status",
  additionalDetails: "Last successful heartbeat: 2026-03-29T14:22:00Z\nAffected workspace: /Users/user1/project",
  timestamp: "March 29, 2026 at 2:27 PM UTC"
};
({
  previewProps: SystemAlert2.PreviewProps});
z.object({
  email: z.string().email(),
  docsUrl: z.string().url(),
  websiteUrl: z.string().url()
});
function WaitlistConfirmation({ email, docsUrl, websiteUrl }) {
  return jsxs(Wrapper, {
    preview: "You're on the Vreko early access list",
    children: [
      jsx(Heading, {
        style: {
          color: brand.textPrimary,
          fontSize: "28px",
          fontWeight: 700,
          margin: "0 0 8px"
        },
        children: "Thanks for your interest \u{1F64F}"
      }),
      jsx(Text, {
        style: {
          color: brand.textSecondary,
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 24px"
        },
        children: "Hey there, you're on the list. We're letting people in gradually to make sure everyone gets a great experience. We'll email you when it's your turn."
      }),
      jsxs(Section, {
        style: {
          backgroundColor: brand.surfaceElevated,
          borderRadius: "8px",
          padding: "20px",
          border: `1px solid ${brand.border}`,
          marginBottom: "24px"
        },
        children: [
          jsx(Text, {
            style: {
              color: brand.textSecondary,
              fontSize: "12px",
              fontWeight: 600,
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            },
            children: "In the meantime"
          }),
          jsxs(Text, {
            style: {
              color: brand.textPrimary,
              fontSize: "14px",
              margin: "0 0 8px"
            },
            children: [
              jsx("span", {
                style: {
                  color: brand.primary,
                  marginRight: "8px"
                },
                children: "\u2192"
              }),
              jsx("a", {
                href: docsUrl,
                style: {
                  color: brand.primary,
                  textDecoration: "none"
                },
                children: "Documentation"
              })
            ]
          }),
          jsxs(Text, {
            style: {
              color: brand.textPrimary,
              fontSize: "14px",
              margin: 0
            },
            children: [
              jsx("span", {
                style: {
                  color: brand.primary,
                  marginRight: "8px"
                },
                children: "\u2192"
              }),
              jsx("a", {
                href: websiteUrl,
                style: {
                  color: brand.primary,
                  textDecoration: "none"
                },
                children: "Website"
              })
            ]
          })
        ]
      }),
      jsx(Hr, {
        style: {
          borderColor: brand.border,
          margin: "24px 0"
        }
      }),
      jsx(Text, {
        style: {
          color: brand.textMuted,
          fontSize: "12px",
          margin: 0
        },
        children: " - Q, founder of Vreko"
      })
    ]
  });
}
__name(WaitlistConfirmation, "WaitlistConfirmation");
WaitlistConfirmation.PreviewProps = {
  email: "dev@example.com",
  docsUrl: "https://docs.vreko.dev",
  websiteUrl: "https://vreko.dev"
};
({
  previewProps: WaitlistConfirmation.PreviewProps});
z.object({
  firstName: z.string(),
  weekStartDate: z.string(),
  weekEndDate: z.string(),
  stats: z.object({
    totalSnapshots: z.number(),
    testsPassed: z.number(),
    regressionsCaught: z.number(),
    activeProjects: z.number(),
    pioneerPointsEarned: z.number(),
    comparisonToPreviousWeek: z.object({
      snapshotsDelta: z.number(),
      regressionsDelta: z.number()
    }).optional()
  }),
  highlights: z.array(z.object({
    icon: z.string(),
    title: z.string(),
    description: z.string()
  })),
  dashboardUrl: z.string().url()
});
function deltaLabel(delta) {
  if (delta > 0) {
    return `+${delta} from last week`;
  }
  if (delta < 0) {
    return `${delta} from last week`;
  }
  return "same as last week";
}
__name(deltaLabel, "deltaLabel");
function WeeklyDigest2({ firstName, weekStartDate, weekEndDate, stats, highlights, dashboardUrl }) {
  const statItems = [
    {
      label: "Snapshots",
      value: stats.totalSnapshots,
      delta: stats.comparisonToPreviousWeek?.snapshotsDelta
    },
    {
      label: "Tests passed",
      value: stats.testsPassed,
      delta: void 0
    },
    {
      label: "Regressions caught",
      value: stats.regressionsCaught,
      delta: stats.comparisonToPreviousWeek?.regressionsDelta
    },
    {
      label: "Active projects",
      value: stats.activeProjects,
      delta: void 0
    },
    {
      label: "Pioneer points",
      value: stats.pioneerPointsEarned,
      delta: void 0
    }
  ];
  return jsxs(Wrapper, {
    preview: "Your weekly intelligence summary is ready",
    children: [
      jsx(Heading, {
        style: {
          color: brand.textPrimary,
          fontSize: "24px",
          fontWeight: 700,
          margin: "0 0 8px"
        },
        children: "\u{1F98E} Your week in review"
      }),
      jsxs(Text, {
        style: {
          color: brand.textSecondary,
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 24px"
        },
        children: [
          firstName,
          ", here's your Vreko intelligence summary for ",
          weekStartDate,
          " \u2013 ",
          weekEndDate,
          "."
        ]
      }),
      jsx(Section, {
        style: {
          marginBottom: "24px"
        },
        children: jsx("table", {
          style: {
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "8px"
          },
          children: jsx("tbody", {
            children: [
              0,
              2,
              4
            ].map((rowStart) => jsx("tr", {
              children: statItems.slice(rowStart, rowStart + 2).map((stat, j) => jsxs("td", {
                style: {
                  backgroundColor: brand.surfaceElevated,
                  borderRadius: "8px",
                  border: `1px solid ${brand.border}`,
                  padding: "16px",
                  width: "50%",
                  verticalAlign: "top"
                },
                children: [
                  jsx(Text, {
                    style: {
                      color: brand.primary,
                      fontSize: "28px",
                      fontWeight: 700,
                      margin: "0 0 4px",
                      lineHeight: 1
                    },
                    children: stat.value.toLocaleString()
                  }),
                  jsx(Text, {
                    style: {
                      color: brand.textMuted,
                      fontSize: "12px",
                      margin: 0
                    },
                    children: stat.label
                  }),
                  stat.delta !== void 0 && jsx(Text, {
                    style: {
                      color: stat.delta >= 0 ? brand.success : brand.danger,
                      fontSize: "11px",
                      margin: "4px 0 0"
                    },
                    children: deltaLabel(stat.delta)
                  })
                ]
              }, j))
            }, rowStart))
          })
        })
      }),
      highlights.length > 0 && jsxs(Fragment, {
        children: [
          jsx(Text, {
            style: {
              color: brand.textSecondary,
              fontSize: "13px",
              fontWeight: 600,
              margin: "0 0 12px",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            },
            children: "Highlights"
          }),
          highlights.map((h, i) => jsx(Section, {
            style: {
              backgroundColor: brand.surfaceElevated,
              borderRadius: "6px",
              padding: "14px 16px",
              border: `1px solid ${brand.border}`,
              marginBottom: "8px"
            },
            children: jsx("table", {
              style: {
                borderCollapse: "collapse"
              },
              children: jsx("tbody", {
                children: jsxs("tr", {
                  children: [
                    jsx("td", {
                      style: {
                        width: "32px",
                        verticalAlign: "top",
                        fontSize: "18px",
                        paddingTop: "2px"
                      },
                      children: h.icon
                    }),
                    jsxs("td", {
                      children: [
                        jsx(Text, {
                          style: {
                            color: brand.textPrimary,
                            fontSize: "14px",
                            fontWeight: 600,
                            margin: "0 0 2px"
                          },
                          children: h.title
                        }),
                        jsx(Text, {
                          style: {
                            color: brand.textMuted,
                            fontSize: "12px",
                            margin: 0
                          },
                          children: h.description
                        })
                      ]
                    })
                  ]
                })
              })
            })
          }, i))
        ]
      }),
      jsx(Hr, {
        style: {
          borderColor: brand.border,
          margin: "24px 0"
        }
      }),
      jsx(PrimaryButton, {
        href: dashboardUrl,
        children: "View Full Dashboard"
      })
    ]
  });
}
__name(WeeklyDigest2, "WeeklyDigest");
WeeklyDigest2.PreviewProps = {
  firstName: "Alex",
  weekStartDate: "Mar 23",
  weekEndDate: "Mar 29, 2026",
  stats: {
    totalSnapshots: 47,
    testsPassed: 312,
    regressionsCaught: 3,
    activeProjects: 2,
    pioneerPointsEarned: 85,
    comparisonToPreviousWeek: {
      snapshotsDelta: 12,
      regressionsDelta: 1
    }
  },
  highlights: [
    {
      icon: "\u{1F6E1}\uFE0F",
      title: "Caught a breaking migration",
      description: "Snapshot restored auth service before data loss occurred"
    },
    {
      icon: "\u26A1",
      title: "Fastest session ever",
      description: "Completed refactor in 23 minutes with 0 regressions"
    },
    {
      icon: "\u{1F9E0}",
      title: "New pattern learned",
      description: '"When editing middleware, check that error handling is preserved"'
    }
  ],
  dashboardUrl: "https://vreko.dev/dashboard"
};
({
  previewProps: WeeklyDigest2.PreviewProps});
z.object({
  firstName: z.string(),
  planName: z.string(),
  planFeatures: z.array(z.string()),
  dashboardUrl: z.string().url(),
  docsUrl: z.string().url(),
  pioneerTier: z.string().optional(),
  pioneerPoints: z.number().optional()
});
var SETUP_STEPS = [
  {
    number: "1",
    text: "Install the VS Code extension",
    href: "vscode:extension/MarcelleLabs.vreko-vscode"
  },
  {
    number: "2",
    text: "Open any project you work on with AI tools",
    href: null
  },
  {
    number: "3",
    text: "Run your next AI prompt  -  Vreko is already informing the context",
    href: null
  }
];
function Welcome2({ firstName, planName, planFeatures, dashboardUrl, docsUrl, pioneerTier, pioneerPoints }) {
  return jsxs(Wrapper, {
    preview: "One link to install. Your agent sees Vreko on the next prompt.",
    children: [
      jsx(Heading, {
        style: {
          color: brand.textPrimary,
          fontSize: "28px",
          fontWeight: 700,
          margin: "0 0 8px"
        },
        children: "Welcome to Vreko \u{1F98E}"
      }),
      jsxs(Text, {
        style: {
          color: brand.textSecondary,
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 8px"
        },
        children: [
          "Hey ",
          firstName,
          ", you're in.",
          " ",
          pioneerTier ? "Pioneer access means full Pro features free during beta, and a permanent discount when we launch." : `Your ${planName} plan is active.`
        ]
      }),
      jsx(Text, {
        style: {
          color: brand.textSecondary,
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 24px"
        },
        children: "Here's what to do in the next 5 minutes:"
      }),
      jsx(Section, {
        style: {
          backgroundColor: brand.surfaceElevated,
          borderRadius: "8px",
          padding: "20px",
          border: `1px solid ${brand.border}`,
          marginBottom: "24px"
        },
        children: SETUP_STEPS.map((step) => jsxs(Text, {
          style: {
            color: brand.textPrimary,
            fontSize: "14px",
            margin: "0 0 12px",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px"
          },
          children: [
            jsxs("span", {
              style: {
                color: brand.primary,
                fontWeight: 700,
                minWidth: "20px"
              },
              children: [
                step.number,
                "."
              ]
            }),
            step.text
          ]
        }, step.number))
      }),
      jsx(Text, {
        style: {
          color: brand.textSecondary,
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 24px"
        },
        children: "You don't need to configure anything. Vreko detects your agent setup (Cursor, Claude, Copilot) and writes its intelligence directly into the context files your agent already reads. Your next prompt sees it."
      }),
      pioneerTier && jsxs(Section, {
        style: {
          backgroundColor: brand.surfaceElevated,
          borderRadius: "8px",
          padding: "20px",
          border: `1px solid ${brand.primary}`,
          marginBottom: "24px"
        },
        children: [
          jsx(Text, {
            style: {
              color: brand.primary,
              fontSize: "12px",
              fontWeight: 600,
              margin: "0 0 4px",
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            },
            children: "Pioneer Program"
          }),
          jsxs(Text, {
            style: {
              color: brand.textPrimary,
              fontSize: "16px",
              fontWeight: 700,
              margin: "0 0 4px"
            },
            children: [
              pioneerTier,
              " Pioneer \u{1F98E}"
            ]
          }),
          pioneerPoints !== void 0 && jsxs(Text, {
            style: {
              color: brand.textSecondary,
              fontSize: "13px",
              margin: 0
            },
            children: [
              pioneerPoints,
              " points earned"
            ]
          })
        ]
      }),
      jsx(PrimaryButton, {
        href: dashboardUrl,
        children: "Open Dashboard"
      }),
      jsx("span", {
        style: {
          display: "inline-block",
          width: "12px"
        }
      }),
      jsx(GhostButton, {
        href: docsUrl,
        children: "Read the Docs"
      }),
      jsx(Hr, {
        style: {
          borderColor: brand.border,
          margin: "24px 0"
        }
      }),
      jsx(Text, {
        style: {
          color: brand.textSecondary,
          fontSize: "13px",
          lineHeight: "1.6",
          margin: "0 0 12px"
        },
        children: "If you use Claude Desktop or a custom agent harness, reply to this email and I'll send you the advanced integration guide (MCP, hooks, CLI)."
      }),
      jsx(Text, {
        style: {
          color: brand.textMuted,
          fontSize: "12px",
          margin: "0 0 8px"
        },
        children: "- Q, solo founder, Marcelle Labs"
      }),
      jsx(Text, {
        style: {
          color: brand.textMuted,
          fontSize: "12px",
          margin: 0
        },
        children: "P.S. Everything Vreko learns stays on your machine. Only metadata reaches us, and only for features you've opted into."
      })
    ]
  });
}
__name(Welcome2, "Welcome");
Welcome2.PreviewProps = {
  firstName: "Alex",
  planName: "Pro",
  planFeatures: [
    "Unlimited AI-triggered snapshots",
    "Pattern learning across sessions",
    "Priority support",
    "Advanced intelligence briefings"
  ],
  dashboardUrl: "https://vreko.dev/dashboard",
  docsUrl: "https://vreko.dev/docs",
  pioneerTier: "Gold",
  pioneerPoints: 420
};
({
  previewProps: Welcome2.PreviewProps});
z.object({
  firstName: z.string(),
  insightTeaser: z.string(),
  resolvedObservation: z.string(),
  resolvedAction: z.string(),
  daysObserved: z.number(),
  dashboardUrl: z.string().url()
});
(class {
  static {
    __name(this, "EmailService");
  }
  middlewares = [];
  // biome-ignore lint/suspicious/noExplicitAny: template registry interface is not yet finalized
  templateRegistry;
  providers = /* @__PURE__ */ new Map();
  defaultFrom = "Vreko <q@vreko.dev>";
  fromAddresses = {};
  defaultReplyTo;
  dryRunMode = false;
  /**
   * Enable or disable service-level dry-run mode.
   * When enabled, emails are rendered but never sent  -  the full payload is logged instead.
   */
  setDryRun(enabled) {
    this.dryRunMode = enabled;
    return this;
  }
  /**
   * Set per-category from addresses (e.g. { authentication: 'security@...' })
   */
  setFromAddresses(addresses) {
    this.fromAddresses = addresses;
    return this;
  }
  /**
   * Set the default from address used when no category-specific address is configured
   */
  setDefaultFrom(from) {
    this.defaultFrom = from;
    return this;
  }
  /**
   * Set a global reply-to address for all outgoing emails
   */
  setDefaultReplyTo(replyTo) {
    this.defaultReplyTo = replyTo;
    return this;
  }
  /**
   * Add middleware to the processing chain
   */
  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }
  /**
   * Primary send method with composable middleware
   */
  async send(request) {
    if (this.dryRunMode || request.dryRun) {
      return this.handleDryRun(request);
    }
    const execute = this.middlewares.reduceRight((next, middleware) => () => middleware(request, next), () => this.executeDelivery(request));
    return execute();
  }
  /**
   * Template-based convenience method
   */
  async sendFromTemplate(options) {
    const template = await this.templateRegistry?.get(options.templateId);
    if (!template) {
      return {
        success: false,
        error: `Template not found: ${options.templateId}`
      };
    }
    const validation = template.schema.safeParse(options.context);
    if (!validation.success) {
      return {
        success: false,
        error: `Invalid template context: ${validation.error.message}`
      };
    }
    const category = template.category;
    const priority = this.getPriorityForCategory(category);
    return this.send({
      to: options.to,
      provider: "auto",
      category,
      priority,
      template: {
        id: options.templateId,
        props: validation.data
      },
      metadata: options.metadata
    });
  }
  /**
   * Batch sending for digests
   */
  async sendBatch(requests) {
    const results = await Promise.allSettled(requests.map((request) => this.send(request)));
    const succeeded = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    return {
      total: requests.length,
      succeeded,
      failed: requests.length - succeeded,
      results: results.map((r) => r.status === "fulfilled" ? r.value : {
        success: false,
        error: "Promise rejected"
      })
    };
  }
  /**
   * Execute email delivery (called after middleware chain)
   */
  async executeDelivery(request) {
    try {
      const template = await this.templateRegistry?.get(request.template.id);
      if (!template) {
        throw new Error(`Template not found: ${request.template.id}`);
      }
      const html = await render(template.component(request.template.props));
      const text = await render(template.component(request.template.props), {
        plainText: true
      });
      const from = this.fromAddresses[request.category] ?? this.defaultFrom;
      const provider = this.selectProvider(request);
      const result = await provider.send({
        from,
        to: request.to.email,
        subject: template.subject(request.template.props),
        html,
        text,
        replyTo: this.defaultReplyTo,
        tags: [
          {
            name: "category",
            value: request.category
          },
          {
            name: "template",
            value: request.template.id.split(".")[1] ?? request.template.id
          }
        ],
        metadata: request.metadata
      });
      await this.trackDelivery({
        userId: request.to.userId,
        templateId: request.template.id,
        category: request.category,
        provider: request.provider || "resend",
        recipientEmail: request.to.email,
        subject: template.subject(request.template.props),
        status: result.status,
        emailId: result.id,
        metadata: request.metadata
      });
      return {
        success: result.status === "sent",
        emailId: result.id,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  /**
   * Handle dry-run mode  -  renders the template fully and logs the complete payload
   * that would have been sent to the provider, without making any network calls.
   */
  async handleDryRun(request) {
    const template = await this.templateRegistry?.get(request.template.id);
    this.fromAddresses[request.category] ?? this.defaultFrom;
    request.template.id;
    if (template) {
      template.subject(request.template.props);
      await render(template.component(request.template.props));
      await render(template.component(request.template.props), {
        plainText: true
      });
    }
    return {
      success: true,
      emailId: `dry-run-${Date.now()}`
    };
  }
  /**
   * Select provider based on category or explicit request
   */
  // biome-ignore lint/suspicious/noExplicitAny: provider map holds heterogeneous provider types
  selectProvider(request) {
    if (request.provider && request.provider !== "auto") {
      return this.providers.get(request.provider);
    }
    const provider = request.category === "marketing" ? "hubspot" : "resend";
    return this.providers.get(provider);
  }
  /**
   * Get default priority for email category
   */
  getPriorityForCategory(category) {
    const priorityMap = {
      authentication: "critical",
      billing: "high",
      onboarding: "high",
      product: "normal",
      marketing: "low"
    };
    return priorityMap[category] || "normal";
  }
  /**
   * Track email delivery in database
   */
  async trackDelivery(_data) {
  }
  /**
   * Register email provider
   */
  registerProvider(name, provider) {
    this.providers.set(name, provider);
  }
  /**
   * Set template registry
   */
  setTemplateRegistry(registry) {
    this.templateRegistry = registry;
  }
});
var hubspotClient = null;
function getHubSpotClient() {
  if (hubspotClient) {
    return hubspotClient;
  }
  const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!accessToken && !apiKey) {
    throw new Error("Missing HubSpot authentication credentials. Please provide either HUBSPOT_ACCESS_TOKEN or HUBSPOT_API_KEY environment variable.");
  }
  const config2 = {};
  if (accessToken) {
    config2.accessToken = accessToken;
  }
  if (apiKey) {
    config2.developerApiKey = apiKey;
  }
  hubspotClient = new Client(config2);
  logger.info("HubSpot client initialized successfully");
  return hubspotClient;
}
__name(getHubSpotClient, "getHubSpotClient");
var createContact = /* @__PURE__ */ __name(async (params) => {
  const client = getHubSpotClient();
  try {
    logger.info("Creating contact in HubSpot", {
      email: params.properties.email
    });
    const properties = {};
    for (const [key, value] of Object.entries(params.properties)) {
      if (value !== void 0 && value !== null) {
        properties[key] = value.toString();
      }
    }
    const response = await client.crm.contacts.basicApi.create({
      properties
    });
    logger.info("Contact created successfully", {
      id: response.id,
      email: params.properties.email
    });
    const contactProperties = {};
    for (const [key, value] of Object.entries(response.properties)) {
      if (value !== void 0 && value !== null) {
        contactProperties[key] = value.toString();
      }
    }
    return {
      id: response.id,
      ...contactProperties
    };
  } catch (error) {
    logger.error("Failed to create contact", {
      error,
      email: params.properties.email
    });
    throw error;
  }
}, "createContact");
var updateContact = /* @__PURE__ */ __name(async (params) => {
  const client = getHubSpotClient();
  try {
    logger.info("Updating contact in HubSpot", {
      id: params.id
    });
    const properties = {};
    for (const [key, value] of Object.entries(params.properties)) {
      if (value !== void 0 && value !== null) {
        properties[key] = value.toString();
      }
    }
    const response = await client.crm.contacts.basicApi.update(params.id, {
      properties
    });
    logger.info("Contact updated successfully", {
      id: response.id
    });
    const contactProperties = {};
    for (const [key, value] of Object.entries(response.properties)) {
      if (value !== void 0 && value !== null) {
        contactProperties[key] = value.toString();
      }
    }
    return {
      id: response.id,
      ...contactProperties
    };
  } catch (error) {
    logger.error("Failed to update contact", {
      error,
      id: params.id
    });
    throw error;
  }
}, "updateContact");

// ../../packages/integrations/dist/hubspot/lib/contacts.js
async function createHubSpotContact(params) {
  return await createContact(params);
}
__name(createHubSpotContact, "createHubSpotContact");
async function updateHubSpotContact(params) {
  return await updateContact(params);
}
__name(updateHubSpotContact, "updateHubSpotContact");

// ../../packages/integrations/dist/hubspot/lib/sync.js
async function syncUserToHubSpot(userData) {
  logger.info("Syncing user to HubSpot", {
    email: userData.email
  });
  const properties = mapUserDataToHubSpotProperties(userData);
  try {
    const existingContact = await findContactByEmail(userData.email);
    if (existingContact?.id) {
      const updated = await updateHubSpotContact({
        id: existingContact.id,
        properties
      });
      logger.info("Updated existing HubSpot contact", {
        id: updated.id,
        email: userData.email
      });
      return updated.id;
    }
    const created = await createHubSpotContact({
      properties
    });
    logger.info("Created new HubSpot contact", {
      id: created.id,
      email: userData.email
    });
    return created.id;
  } catch (error) {
    logger.error("Failed to sync user to HubSpot", {
      error,
      email: userData.email
    });
    throw error;
  }
}
__name(syncUserToHubSpot, "syncUserToHubSpot");
async function findContactByEmail(email) {
  try {
    const client = getHubSpotClient();
    const response = await client.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              // @ts-expect-error - HubSpot SDK type definitions may not match actual API
              operator: "EQ",
              value: email
            }
          ]
        }
      ],
      properties: [
        "email",
        "firstname",
        "lastname",
        "vreko_user_id"
      ],
      limit: 1
    });
    if (response.results && response.results.length > 0) {
      const result = response.results[0];
      return {
        id: result.id,
        ...result.properties
      };
    }
    return null;
  } catch (_error) {
    logger.warn("Contact not found by email", {
      email
    });
    return null;
  }
}
__name(findContactByEmail, "findContactByEmail");
function mapUserDataToHubSpotProperties(userData) {
  const properties = {
    email: userData.email,
    firstname: userData.firstName,
    lastname: userData.lastName,
    // Custom Vreko properties
    vreko_user_id: userData.userId,
    // Extension
    extension_installed: userData.extensionInstalled ? "true" : "false",
    extension_version: userData.extensionVersion,
    // Pioneer
    pioneer_tier: userData.pioneerTier,
    pioneer_points: userData.pioneerPoints?.toString(),
    // Subscription
    subscription_plan: userData.planName,
    subscription_status: userData.subscriptionStatus,
    // Activity
    total_snapshots: userData.totalSnapshots?.toString(),
    total_recoveries: userData.totalRestores?.toString(),
    // Lifecycle
    signup_source: userData.signupSource,
    onboarding_completed: userData.onboardingCompleted ? "true" : "false",
    ai_tool_primary: userData.aiToolPrimary
  };
  if (userData.extensionInstallDate) {
    properties.extension_install_date = userData.extensionInstallDate.getTime().toString();
  }
  if (userData.pioneerJoinDate) {
    properties.pioneer_join_date = userData.pioneerJoinDate.getTime().toString();
  }
  if (userData.subscriptionStartDate) {
    properties.subscription_start_date = userData.subscriptionStartDate.getTime().toString();
  }
  if (userData.lastActiveDate) {
    properties.last_activity_date = userData.lastActiveDate.getTime().toString();
  }
  if (userData.lastSnapshotDate) {
    properties.last_snapshot_date = userData.lastSnapshotDate.getTime().toString();
  }
  if (userData.firstSnapshotDate) {
    properties.first_snapshot_date = userData.firstSnapshotDate.getTime().toString();
  }
  if (userData.firstRestoreDate) {
    properties.first_restore_date = userData.firstRestoreDate.getTime().toString();
  }
  if (userData.mrr !== void 0) {
    properties.mrr = userData.mrr.toString();
  }
  return Object.fromEntries(Object.entries(properties).filter(([_, v]) => v !== void 0));
}
__name(mapUserDataToHubSpotProperties, "mapUserDataToHubSpotProperties");
var { subscriptions, webhookEvents, user } = combinedSchema;
var stripeClient = null;
new EntitlementsServiceImpl();
({
  pro: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  team: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
  enterprise: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID
});
function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Missing env variable STRIPE_SECRET_KEY");
  }
  stripeClient = new Stripe(stripeSecretKey);
  return stripeClient;
}
__name(getStripeClient, "getStripeClient");
var setSubscriptionSeats = /* @__PURE__ */ __name(async (options) => {
  const stripeClient2 = getStripeClient();
  const subscription = await stripeClient2.subscriptions.retrieve(options.id);
  if (!subscription) {
    throw new Error("Subscription not found.");
  }
  await stripeClient2.subscriptions.update(options.id, {
    items: [
      {
        id: subscription.items.data[0].id,
        quantity: options.seats
      }
    ]
  });
}, "setSubscriptionSeats");

// ../../packages/integrations/dist/stripe/lib/customer.js
createLogger({
  name: "payments",
  level: LogLevel.INFO
});

// ../../packages/integrations/dist/stripe/lib/helper.js
config.payments.plans;

// ../../packages/auth/dist/lib/audit.js
var POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || "";
var POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.posthog.com";
var POSTHOG_ENABLED = !!POSTHOG_API_KEY;
async function emitPostHogEvent(eventType, metadata) {
  if (!POSTHOG_ENABLED) {
    return;
  }
  try {
    const event = {
      api_key: POSTHOG_API_KEY,
      event: eventType,
      distinct_id: metadata.userId || metadata.ip || "anonymous",
      properties: {
        ...metadata,
        $ip: metadata.ip,
        $set: {
          email: metadata.userId ? `user_${metadata.userId}` : void 0
        }
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const response = await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });
    if (!response.ok) {
      logger.error("Failed to emit PostHog event", {
        eventType,
        status: response.status,
        statusText: response.statusText
      });
    }
  } catch (error) {
    logger.error("Error emitting PostHog event", {
      error,
      eventType
    });
  }
}
__name(emitPostHogEvent, "emitPostHogEvent");
async function writeAuditLog(eventType, metadata) {
  try {
    const { db: db2, vrekoSchema } = await import('./dist-MDULWGRB.js');
    if (!db2) {
      logger.warn("Database not available for audit logging", {
        eventType
      });
      return;
    }
    const { telemetryEvents } = vrekoSchema;
    await db2.insert(telemetryEvents).values({
      eventType,
      eventCategory: "audit",
      userId: metadata.userId,
      properties: {
        ip: metadata.ip,
        userAgent: metadata.userAgent,
        method: metadata.method,
        path: metadata.path,
        statusCode: metadata.statusCode,
        errorMessage: metadata.errorMessage,
        ...metadata
      }
    });
    logger.debug("Audit log written", {
      eventType,
      userId: metadata.userId,
      orgId: metadata.orgId
    });
  } catch (error) {
    logger.error("Failed to write audit log", {
      error,
      eventType,
      metadata
    });
  }
}
__name(writeAuditLog, "writeAuditLog");
async function trackEvent(eventType, metadata) {
  logger.info("Audit event", {
    eventType,
    userId: metadata.userId,
    orgId: metadata.orgId,
    path: metadata.path
  });
  emitPostHogEvent(eventType, metadata).catch((error) => {
    logger.error("PostHog emit failed", {
      error,
      eventType
    });
  });
  writeAuditLog(eventType, metadata).catch((error) => {
    logger.error("Audit log write failed", {
      error,
      eventType
    });
  });
}
__name(trackEvent, "trackEvent");

// ../../packages/auth/dist/lib/organization.js
async function updateSeatsInOrganizationSubscription(organizationId) {
  const organization2 = await getOrganizationWithPurchasesAndMembersCount(organizationId);
  if (!organization2?.purchases || !Array.isArray(organization2.purchases) || organization2.purchases.length === 0) {
    return;
  }
  const activeSubscription = organization2.purchases.find((purchase) => purchase.type === "SUBSCRIPTION");
  if (!activeSubscription?.subscriptionId) {
    return;
  }
  try {
    await setSubscriptionSeats({
      id: activeSubscription.subscriptionId,
      seats: organization2.membersCount
    });
  } catch (error) {
    logger.error("Could not update seats in organization subscription", {
      organizationId,
      error
    });
  }
}
__name(updateSeatsInOrganizationSubscription, "updateSeatsInOrganizationSubscription");

// ../../packages/auth/dist/auth.js
var appUrl = process.env.APP_URL || getBaseUrl();
var authBaseUrl = process.env.BETTER_AUTH_URL || process.env.BETTER_AUTH_BASE_URL || process.env.APP_URL || `http://localhost:${process.env.PORT || 3e3}`;
var isLocalDev = (process.env.BETTER_AUTH_URL || "").includes("localhost");
var isDevelopment = process.env.NODE_ENV !== "production" || isLocalDev;
var trustedOrigins = isDevelopment ? [
  appUrl,
  authBaseUrl,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003"
] : [
  appUrl,
  authBaseUrl
].filter((url, index, arr) => arr.indexOf(url) === index);
var _auth = betterAuth({
  // ✅ Base URL for callbacks and redirects (required by Better Auth)
  // Uses BETTER_AUTH_URL env var, falling back to localhost with PORT
  baseURL: authBaseUrl,
  // Custom user fields returned by getSession().
  // Must be under user.additionalFields — schema.user.fields only affects migrations,
  // not the session output path (Better Auth reads options.user.additionalFields in
  // getFields() / parseUserOutput()).
  user: {
    additionalFields: {
      onboardingComplete: {
        type: "boolean",
        required: false,
        defaultValue: false
      },
      deviceFingerprint: {
        type: "string",
        required: false
      }
    }
  },
  appName: "Vreko",
  // ✅ SECURITY: Prevent account enumeration attacks
  // OWASP ASVS 2.2.1 - Don't reveal whether username exists
  disablePaths: [
    "/is-username-available"
  ],
  endpoints: {
    GET: {
      "/health": {
        async handler() {
          return new Response("OK", {
            status: 200
          });
        }
      }
    }
  },
  emailAndPassword: {
    enabled: true
  },
  socialProviders: {
    // Only include social providers if credentials are configured
    // This prevents Better Auth from logging warnings that corrupt MCP stdio
    // Note: Access process.env directly for Vercel compatibility (t3-env wrapper issue)
    ...process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        // Block OAuth auto-signup  -  require invite code flow
        disableImplicitSignUp: true
      }
    } : {},
    ...process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // Block OAuth auto-signup  -  require invite code flow
        disableImplicitSignUp: true
      }
    } : {}
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: combinedSchema
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    // Always persist sessions in DB (no secondary storage)
    storeSessionInDatabase: true
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: [
        "google",
        "github"
      ]
    }
  },
  trustedOrigins,
  // ✅ OPTIMIZATION: Redis secondary storage removed for alpha (DB-backed sessions)
  // Re-add if rate-limit distribution becomes a requirement post-launch.
  advanced: {
    // ✅ FIX: Use isDevelopment (not NODE_ENV) so Doppler prd config running locally
    // still gets dev-friendly cookie settings. isDevelopment checks BETTER_AUTH_URL
    // for localhost, which Doppler overrides correctly.
    useSecureCookies: !isDevelopment,
    crossSiteRequestForgery: {
      enabled: true,
      // Verify origin header matches trusted origins
      checkOrigin: true
    },
    // ✅ OPTIMIZATION: Explicit ID generation using nanoid
    database: {
      generateId: /* @__PURE__ */ __name(() => nanoid(), "generateId"),
      defaultFindManyLimit: 100
    },
    // ✅ OPTIMIZATION: IP tracking configuration for security audit
    ipAddress: {
      ipAddressHeaders: [
        "cf-connecting-ip",
        "x-real-ip",
        "x-forwarded-for",
        "x-client-ip"
      ],
      disableIpTracking: false
    },
    // ✅ OPTIMIZATION: Enhanced cookie configuration
    // ✅ FIX: Use isDevelopment consistently (not env.NODE_ENV === "production")
    // Doppler prd sets NODE_ENV=production even when running locally, which would
    // incorrectly set domain=".vreko.dev" on localhost cookies.
    crossSubDomainCookies: {
      enabled: !isDevelopment,
      domain: !isDevelopment ? ".vreko.dev" : void 0
    },
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: !isDevelopment,
      httpOnly: true,
      path: "/"
    },
    // ✅ FIX: OAuth state/pkce cookies need SameSite=None for cross-site redirects
    // See: https://github.com/better-auth/better-auth/issues/6483
    // Note: In development (localhost), browsers allow SameSite=None without Secure
    cookies: {
      state: {
        name: "vreko.state",
        attributes: {
          sameSite: isDevelopment ? "lax" : "none",
          secure: !isDevelopment,
          httpOnly: true,
          path: "/",
          maxAge: 600
        }
      },
      pkce: {
        name: "vreko.pkce",
        attributes: {
          sameSite: isDevelopment ? "lax" : "none",
          secure: !isDevelopment,
          httpOnly: true,
          path: "/",
          maxAge: 600
        }
      }
    },
    cookiePrefix: "vreko"
  },
  // Rate limiting configuration (replaces 340+ lines of custom rate limit code)
  rateLimit: {
    window: 60,
    max: 100,
    // In-memory storage  -  sufficient for alpha single-instance deployment
    storage: "memory",
    customRules: {
      "/sign-in/email": {
        window: 10,
        max: 3
      },
      "/sign-in/social": {
        window: 10,
        max: 5
      },
      "/sign-up": {
        window: 60,
        max: 5
      },
      "/health": false,
      "/health/ready": false,
      "/health/live": false
    }
  },
  // Use database hooks for audit logging (replaces 371 lines of custom auth-audit.ts)
  // Also includes rate limiting configuration (replaces 340+ lines of custom rate limit code)
  databaseHooks: {
    session: {
      create: {
        after: /* @__PURE__ */ __name(async (session) => {
          const { userId, id: sessionId } = session;
          await trackEvent("session.created", {
            userId
          });
          await trackEvent("auth.signin", {
            userId,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          try {
            const { db: db2 } = await import('./dist-MDULWGRB.js');
            const { sql } = await import('drizzle-orm');
            if (db2) {
              const result = await db2.execute(sql`
								DELETE FROM session
								WHERE "userId" = ${userId}
								AND id != ${sessionId}
							`);
              const rotatedCount = result.rowCount || 0;
              if (rotatedCount > 0) {
                logger.info("Session regenerated on login - old sessions invalidated", {
                  userId,
                  sessionId,
                  rotatedCount
                });
                await trackEvent("session.regenerated", {
                  userId,
                  reason: "login",
                  rotatedCount
                });
              }
            }
          } catch (error) {
            logger.warn("Session regeneration failed on login", {
              userId,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }, "after")
      },
      delete: {
        after: /* @__PURE__ */ __name(async (session) => {
          const { userId } = session;
          await trackEvent("session.revoked", {
            userId
          });
          await trackEvent("auth.signout", {
            userId,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        }, "after")
      }
    },
    user: {
      create: {
        before: /* @__PURE__ */ __name(async (user2) => {
          const oauthState = await getOAuthState().catch(() => null);
          const inviteCode = oauthState?.inviteCode ?? user2.__inviteCode;
          if (!inviteCode && user2.email) {
            const { pendingApiKeys: pendingApiKeysTable, inviteCodes: inviteCodesTable, burnInviteCode } = await import('./dist-MDULWGRB.js');
            const { and: and2, eq: eq2, gt, isNull, sql } = await import('drizzle-orm');
            const claim = await db.select().from(pendingApiKeysTable).where(and2(eq2(pendingApiKeysTable.userId, user2.email), eq2(pendingApiKeysTable.purpose, "pioneer_magic_claim"), gt(pendingApiKeysTable.expiresAt, /* @__PURE__ */ new Date()))).limit(1);
            if (claim.length > 0) {
              const codeRow = await db.select().from(inviteCodesTable).where(and2(sql`lower(${inviteCodesTable.invitedEmail}) = lower(${user2.email})`, sql`${inviteCodesTable.currentUses} < ${inviteCodesTable.maxUses}`, isNull(inviteCodesTable.revokedAt))).limit(1);
              if (codeRow.length > 0) {
                await burnInviteCode(db, codeRow[0].id);
                await db.delete(pendingApiKeysTable).where(eq2(pendingApiKeysTable.userId, user2.email));
                return {
                  data: user2
                };
              }
            }
          }
          if (!inviteCode) {
            throw new Error("INVITE_REQUIRED: An invite code is required to create an account.");
          }
          try {
            const { db: db2 } = await import('./dist-MDULWGRB.js');
            const { inviteCodes } = await import('./dist-MDULWGRB.js');
            const { and: and2, eq: eq2, sql } = await import('drizzle-orm');
            const code = await db2.select().from(inviteCodes).where(eq2(inviteCodes.code, inviteCode)).limit(1);
            if (code.length === 0) {
              throw new Error("INVALID_INVITE_CODE");
            }
            const entry = code[0];
            if (entry.expiresAt && entry.expiresAt < /* @__PURE__ */ new Date()) {
              throw new Error("INVITE_CODE_EXPIRED");
            }
            const burned = await db2.update(inviteCodes).set({
              currentUses: sql`${inviteCodes.currentUses} + 1`,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(and2(eq2(inviteCodes.id, entry.id), sql`${inviteCodes.currentUses} < ${inviteCodes.maxUses}`)).returning();
            if (burned.length === 0) {
              throw new Error("INVITE_CODE_EXHAUSTED");
            }
          } catch (error) {
            if (error instanceof Error && error.message.startsWith("INVITE")) {
              throw error;
            }
            logger.error("Invite gate DB error", {
              error
            });
            throw new Error("INVITE_GATE_ERROR");
          }
          return {
            data: user2
          };
        }, "before"),
        after: /* @__PURE__ */ __name(async (user2) => {
          const { id: userId, email } = user2;
          await trackEvent("auth.signup", {
            userId,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
          syncUserToHubSpot({
            userId,
            email,
            signupSource: "app"
          }).catch((err) => {
            logger.warn("HubSpot signup sync failed (non-blocking)", {
              userId,
              error: err instanceof Error ? err.message : String(err)
            });
          });
        }, "after")
      }
    }
  },
  plugins: [
    bearer(),
    deviceAuthorization({
      verificationUri: "/device"
    }),
    admin(),
    openAPI(),
    // magicLink()  -  server-side handler for POST /api/auth/sign-in/magic-link
    magicLink({
      sendMagicLink: /* @__PURE__ */ __name(async ({ email, url }) => {
        await sendEmail({
          from: "Vreko <noreply@vreko.dev>",
          to: email,
          subject: "Sign in to Vreko",
          html: `<p>Click <a href="${url}">here</a> to sign in. This link expires in 5 minutes.</p>`
        });
      }, "sendMagicLink")
    }),
    // organization()  -  server-side org endpoints (schema: packages/platform/src/db/schema/postgres.ts)
    organization()
  ],
  onAPIError: {
    onError(error, ctx) {
      const errorDetails = {
        error,
        context: ctx
      };
      if (error && typeof error === "object") {
        if ("code" in error) {
          errorDetails.errorCode = error.code;
        }
        if ("message" in error) {
          errorDetails.errorMessage = error.message;
        }
        if ("statusCode" in error) {
          errorDetails.statusCode = error.statusCode;
        }
      }
      let isOAuthError = false;
      if (ctx && typeof ctx === "object") {
        if ("request" in ctx) {
          const request = ctx.request;
          errorDetails.requestUrl = request.url;
          errorDetails.requestMethod = request.method;
          if (request.url?.includes("/api/auth/callback/")) {
            const provider = request.url.split("/callback/")[1]?.split("?")[0];
            errorDetails.oauthProvider = provider;
            errorDetails.errorType = "OAuth Callback Error";
            isOAuthError = true;
            logger.error("OAuth Callback Error", errorDetails);
          }
        }
      }
      if (!isOAuthError) {
        logger.error("Better Auth API Error", errorDetails);
      }
      trackEvent("auth.signin_failed", {
        errorCode: errorDetails.errorCode,
        errorMessage: errorDetails.errorMessage,
        path: errorDetails.requestUrl,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }).catch(() => {
      });
      import('./dist-3STT7FYV.js').then(({ captureError }) => {
        if (captureError && error instanceof Error) {
          captureError(error, {
            tags: {
              errorType: isOAuthError ? "oauth_callback" : "auth_api",
              ...errorDetails.errorCode ? {
                errorCode: String(errorDetails.errorCode)
              } : {}
            },
            extra: errorDetails
          });
        }
      }).catch(() => {
      });
    }
  }
});
var auth = _auth;

export { auth, updateSeatsInOrganizationSubscription };
//# sourceMappingURL=auth-H2LUOCCX.js.map
//# sourceMappingURL=auth-H2LUOCCX.js.map