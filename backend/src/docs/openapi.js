const env = require("../config/env");

function jsonResponse(description, schema, examples) {
  return {
    description,
    content: {
      "application/json": {
        schema,
        ...(examples ? { examples } : {})
      }
    }
  };
}

function binaryResponse(description, mediaType = "application/pdf") {
  return {
    description,
    content: {
      [mediaType]: {
        schema: {
          type: "string",
          format: "binary"
        }
      }
    }
  };
}

function htmlResponse(description) {
  return {
    description,
    content: {
      "text/html": {
        schema: {
          type: "string"
        }
      }
    }
  };
}

function redirectResponse(description) {
  return {
    description,
    headers: {
      Location: {
        description: "Redirect target URL",
        schema: {
          type: "string",
          format: "uri"
        }
      }
    }
  };
}

const sessionAndCsrfSecurity = [
  {
    sessionCookie: [],
    csrfHeader: []
  }
];

const sessionOnlySecurity = [
  {
    sessionCookie: []
  }
];

const genericObjectSchema = {
  type: "object",
  additionalProperties: true
};

const genericArraySchema = {
  type: "array",
  items: genericObjectSchema
};

const errorSchema = {
  $ref: "#/components/schemas/ErrorResponse"
};

const messageSchema = {
  $ref: "#/components/schemas/MessageResponse"
};

const artworkFilterParameters = [
  {
    name: "search",
    in: "query",
    schema: { type: "string" },
    description: "Free-text search term."
  },
  {
    name: "style",
    in: "query",
    schema: { type: "string" },
    description: "Artist style filter."
  },
  {
    name: "artType",
    in: "query",
    schema: { type: "string" },
    description: "Main art type filter."
  },
  {
    name: "category",
    in: "query",
    schema: { type: "integer", minimum: 1 },
    description: "Predefined category identifier."
  },
  {
    name: "sort",
    in: "query",
    schema: { type: "string" },
    description: "Sorting strategy such as latest or popular."
  },
  {
    name: "limit",
    in: "query",
    schema: { type: "integer", minimum: 1, maximum: 80 },
    description: "Maximum number of artworks to return."
  }
];

const artistFilterParameters = [
  {
    name: "search",
    in: "query",
    schema: { type: "string" },
    description: "Free-text search term."
  },
  {
    name: "style",
    in: "query",
    schema: { type: "string" },
    description: "Artist style filter."
  },
  {
    name: "artType",
    in: "query",
    schema: { type: "string" },
    description: "Main art type filter."
  },
  {
    name: "sort",
    in: "query",
    schema: { type: "string" },
    description: "Sorting strategy such as featured or latest."
  },
  {
    name: "limit",
    in: "query",
    schema: { type: "integer", minimum: 1, maximum: 60 },
    description: "Maximum number of artists to return."
  }
];

const analyticsRangeParameters = [
  {
    name: "range",
    in: "query",
    schema: {
      type: "string",
      enum: ["24h", "7d", "30d", "90d", "1y"]
    },
    description: "Named analytics time window."
  },
  {
    name: "startAt",
    in: "query",
    schema: { type: "integer" },
    description: "Explicit analytics range start timestamp in milliseconds."
  },
  {
    name: "endAt",
    in: "query",
    schema: { type: "integer" },
    description: "Explicit analytics range end timestamp in milliseconds."
  }
];

const analyticsMetricParameters = [
  ...analyticsRangeParameters,
  {
    name: "limit",
    in: "query",
    schema: { type: "integer", minimum: 1, maximum: 100 },
    description: "Maximum number of ranked rows to return."
  }
];

const analyticsTimeseriesParameters = [
  ...analyticsRangeParameters,
  {
    name: "unit",
    in: "query",
    schema: {
      type: "string",
      enum: ["hour", "day", "month", "year"]
    },
    description: "Requested time bucket."
  }
];

const platformPaths = {
  "/docs/openapi.json": {
    get: {
      tags: ["Platform"],
      summary: "Get the raw OpenAPI document",
      responses: {
        200: jsonResponse("OpenAPI JSON document", genericObjectSchema)
      }
    }
  },
  "/docs": {
    get: {
      tags: ["Platform"],
      summary: "Open the interactive Swagger UI",
      responses: {
        200: htmlResponse("Swagger UI HTML shell")
      }
    }
  },
  "/health": {
    get: {
      tags: ["Platform"],
      summary: "Get API health status",
      description:
        "Health payload exposed by the API router. The backend also exposes a root health endpoint outside the /api namespace.",
      responses: {
        200: jsonResponse("Health payload", genericObjectSchema)
      }
    }
  }
};

const authenticationPaths = {
  "/auth/login": {
    post: {
      tags: ["Authentication"],
      summary: "Start password login",
      description:
        "Verifies credentials and either sends an email login code or directly authenticates the configured admin bypass account.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/LoginRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Login challenge started or bypassed", {
          type: "object",
          additionalProperties: true,
          properties: {
            message: { type: "string" },
            requiresCode: { type: "boolean" },
            redirectTo: { type: "string", nullable: true },
            passwordCompromised: { type: "boolean", nullable: true },
            user: {
              $ref: "#/components/schemas/AuthUser"
            }
          }
        }),
        401: jsonResponse("Invalid credentials", errorSchema),
        403: jsonResponse("Account access denied", errorSchema)
      }
    }
  },
  "/auth/google": {
    get: {
      tags: ["Authentication"],
      summary: "Start Google OAuth sign-in",
      responses: {
        302: redirectResponse("Redirects the browser to Google OAuth")
      }
    }
  },
  "/auth/google/callback": {
    get: {
      tags: ["Authentication"],
      summary: "Complete Google OAuth sign-in",
      parameters: [
        {
          name: "code",
          in: "query",
          schema: { type: "string" },
          required: false
        },
        {
          name: "state",
          in: "query",
          schema: { type: "string" },
          required: false
        },
        {
          name: "error",
          in: "query",
          schema: { type: "string" },
          required: false
        }
      ],
      responses: {
        302: redirectResponse("Redirects the browser back to the frontend application")
      }
    }
  },
  "/auth/google/link": {
    post: {
      tags: ["Authentication"],
      summary: "Link a Google sign-in attempt to an existing password account",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/GoogleLinkRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Google account linked", {
          type: "object",
          properties: {
            message: { type: "string" },
            redirectTo: { type: "string" },
            user: {
              $ref: "#/components/schemas/AuthUser"
            }
          }
        }),
        400: jsonResponse("Google link session missing or invalid", errorSchema),
        401: jsonResponse("Password is incorrect", errorSchema)
      }
    }
  },
  "/auth/register": {
    post: {
      tags: ["Authentication"],
      summary: "Register a collector account",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/RegisterRequest"
            }
          }
        }
      },
      responses: {
        201: jsonResponse("Account created and verification pending", {
          type: "object",
          properties: {
            message: { type: "string" },
            user: genericObjectSchema
          }
        }),
        400: jsonResponse("Invalid registration request", errorSchema),
        409: jsonResponse("Email already in use", errorSchema),
        500: jsonResponse("Registration failed", errorSchema)
      }
    }
  },
  "/auth/resend-verification-email": {
    post: {
      tags: ["Authentication"],
      summary: "Resend the email verification link",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: {
                email: { type: "string", format: "email" }
              }
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Verification resend accepted", messageSchema),
        409: jsonResponse("Email already verified", errorSchema)
      }
    }
  },
  "/auth/verify-email": {
    get: {
      tags: ["Authentication"],
      summary: "Verify an email token",
      parameters: [
        {
          name: "token",
          in: "query",
          required: true,
          schema: { type: "string" }
        }
      ],
      responses: {
        200: jsonResponse("Email verified", messageSchema),
        400: jsonResponse("Invalid or expired verification token", errorSchema)
      }
    }
  },
  "/auth/me": {
    get: {
      tags: ["Authentication"],
      summary: "Get current session user",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Authenticated user", {
          type: "object",
          properties: {
            user: {
              $ref: "#/components/schemas/AuthUser"
            }
          }
        }),
        401: jsonResponse("Authentication required", errorSchema)
      }
    },
    patch: {
      tags: ["Authentication"],
      summary: "Update current user profile",
      security: sessionOnlySecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UpdateProfileRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Profile updated", {
          type: "object",
          properties: {
            user: {
              $ref: "#/components/schemas/AuthUser"
            }
          }
        }),
        400: jsonResponse("No profile fields provided", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        409: jsonResponse("Email already in use", errorSchema)
      }
    }
  },
  "/auth/password": {
    patch: {
      tags: ["Authentication"],
      summary: "Update the current user password",
      security: sessionOnlySecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/UpdatePasswordRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Password updated", messageSchema),
        400: jsonResponse("Invalid password update request", errorSchema),
        401: jsonResponse("Current password is incorrect", errorSchema)
      }
    }
  },
  "/auth/logout": {
    post: {
      tags: ["Authentication"],
      summary: "End the current session",
      responses: {
        200: jsonResponse("Logged out", messageSchema)
      }
    }
  },
  "/auth/forgot-password": {
    post: {
      tags: ["Authentication"],
      summary: "Start a password reset flow",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: {
                email: { type: "string", format: "email" }
              }
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Password reset flow accepted", messageSchema),
        400: jsonResponse("Email is required", errorSchema)
      }
    }
  },
  "/auth/reset-password": {
    post: {
      tags: ["Authentication"],
      summary: "Reset a password or activate an invited admin account",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ResetPasswordRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Password reset or invitation activation completed", messageSchema),
        400: jsonResponse("Invalid or expired reset link", errorSchema)
      }
    }
  },
  "/auth/verify-login-code": {
    post: {
      tags: ["Authentication"],
      summary: "Complete two-step login",
      description: "Consumes the emailed login code and creates the authenticated session cookies.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/VerifyLoginCodeRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Login completed", {
          type: "object",
          properties: {
            message: { type: "string" },
            redirectTo: { type: "string" },
            user: {
              $ref: "#/components/schemas/AuthUser"
            }
          }
        }),
        400: jsonResponse("Login code is required", errorSchema),
        401: jsonResponse("Invalid or expired login code", errorSchema)
      }
    }
  },
  "/auth/refresh": {
    post: {
      tags: ["Authentication"],
      summary: "Rotate the refresh token and renew the session cookies",
      responses: {
        200: jsonResponse("Session refreshed", messageSchema),
        401: jsonResponse("Refresh token missing or invalid", errorSchema)
      }
    }
  }
};

const marketplacePaths = {
  "/marketplace/overview": {
    get: {
      tags: ["Marketplace"],
      summary: "Get homepage discovery payload",
      responses: {
        200: jsonResponse("Discovery payload", {
          type: "object",
          properties: {
            stats: genericObjectSchema,
            artworks: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ArtworkSummary"
              }
            },
            artists: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ArtistSummary"
              }
            }
          }
        }),
        500: jsonResponse("Discovery payload unavailable", errorSchema)
      }
    }
  },
  "/categories": {
    get: {
      tags: ["Marketplace"],
      summary: "List public artwork categories",
      responses: {
        200: jsonResponse("Categories list", {
          type: "object",
          properties: {
            categories: {
              type: "array",
              items: {
                $ref: "#/components/schemas/CategorySummary"
              }
            }
          }
        }),
        500: jsonResponse("Categories unavailable", errorSchema)
      }
    }
  },
  "/artworks": {
    get: {
      tags: ["Marketplace"],
      summary: "List public artworks",
      parameters: artworkFilterParameters,
      responses: {
        200: jsonResponse("Public artworks", {
          type: "object",
          properties: {
            artworks: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ArtworkSummary"
              }
            },
            counts: {
              type: "object",
              required: ["total", "PUBLISHED", "HIDDEN", "ARCHIVED"],
              properties: {
                total: { type: "integer", minimum: 0 },
                PUBLISHED: { type: "integer", minimum: 0 },
                HIDDEN: { type: "integer", minimum: 0 },
                ARCHIVED: { type: "integer", minimum: 0 }
              }
            }
          }
        }),
        500: jsonResponse("Artwork catalog unavailable", errorSchema)
      }
    }
  },
  "/artworks/{id}": {
    get: {
      tags: ["Marketplace"],
      summary: "Get one public artwork",
      parameters: [{ $ref: "#/components/parameters/ArtworkId" }],
      responses: {
        200: jsonResponse("Artwork detail", {
          type: "object",
          properties: {
            artwork: {
              $ref: "#/components/schemas/ArtworkSummary"
            },
            relatedArtworks: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ArtworkSummary"
              }
            }
          }
        }),
        404: jsonResponse("Artwork not found", errorSchema),
        500: jsonResponse("Artwork detail unavailable", errorSchema)
      }
    }
  },
  "/artworks/{id}/favorite": {
    post: {
      tags: ["Collector"],
      summary: "Add one artwork to the current collector favorites",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/ArtworkId" }],
      responses: {
        200: jsonResponse("Artwork added to favorites", messageSchema),
        403: jsonResponse("Collector account required", errorSchema),
        404: jsonResponse("Artwork not found", errorSchema)
      }
    },
    delete: {
      tags: ["Collector"],
      summary: "Remove one artwork from the current collector favorites",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/ArtworkId" }],
      responses: {
        200: jsonResponse("Artwork removed from favorites", messageSchema),
        403: jsonResponse("Collector account required", errorSchema),
        404: jsonResponse("Artwork not found", errorSchema)
      }
    }
  },
  "/artists": {
    get: {
      tags: ["Marketplace"],
      summary: "List public artists",
      parameters: artistFilterParameters,
      responses: {
        200: jsonResponse("Public artists", {
          type: "object",
          properties: {
            artists: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ArtistSummary"
              }
            }
          }
        }),
        500: jsonResponse("Artists listing unavailable", errorSchema)
      }
    }
  },
  "/artists/{id}": {
    get: {
      tags: ["Marketplace"],
      summary: "Get one public artist profile",
      parameters: [{ $ref: "#/components/parameters/ArtistId" }],
      responses: {
        200: jsonResponse("Artist profile detail", {
          type: "object",
          properties: {
            artist: {
              $ref: "#/components/schemas/ArtistSummary"
            },
            artworks: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ArtworkSummary"
              }
            },
            collections: {
              type: "array",
              items: {
                $ref: "#/components/schemas/CollectionSummary"
              }
            }
          }
        }),
        404: jsonResponse("Artist not found", errorSchema),
        500: jsonResponse("Artist profile unavailable", errorSchema)
      }
    }
  },
  "/members/{id}": {
    get: {
      tags: ["Marketplace"],
      summary: "Get one public member profile",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "Numeric public member identifier.",
          schema: {
            type: "integer",
            minimum: 1
          }
        }
      ],
      responses: {
        200: jsonResponse("Member profile detail", {
          type: "object",
          properties: {
            member: {
              $ref: "#/components/schemas/PublicMemberSummary"
            }
          }
        }),
        404: jsonResponse("Member not found", errorSchema),
        500: jsonResponse("Member profile unavailable", errorSchema)
      }
    }
  }
};

const collectorPaths = {
  "/artists/{id}/follow": {
    post: {
      tags: ["Collector"],
      summary: "Follow an artist",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/ArtistId" }],
      responses: {
        200: jsonResponse("Artist followed", messageSchema),
        403: jsonResponse("Collector account required", errorSchema),
        404: jsonResponse("Artist not found", errorSchema),
        409: jsonResponse("Self follow is not allowed", errorSchema)
      }
    },
    delete: {
      tags: ["Collector"],
      summary: "Unfollow an artist",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/ArtistId" }],
      responses: {
        200: jsonResponse("Artist unfollowed", messageSchema),
        403: jsonResponse("Collector account required", errorSchema),
        404: jsonResponse("Artist not found", errorSchema)
      }
    }
  },
  "/follows/me": {
    get: {
      tags: ["Collector"],
      summary: "List the artists followed by the current collector",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Followed artists", {
          type: "object",
          properties: {
            artists: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ArtistSummary"
              }
            }
          }
        }),
        403: jsonResponse("Collector account required", errorSchema)
      }
    }
  },
  "/favorites/me": {
    get: {
      tags: ["Collector"],
      summary: "List the favorite artworks of the current collector",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Favorite artworks", {
          type: "object",
          properties: {
            artworks: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ArtworkSummary"
              }
            }
          }
        }),
        403: jsonResponse("Collector account required", errorSchema)
      }
    }
  },
  "/collections/me": {
    get: {
      tags: ["Collector"],
      summary: "List the current collector personal collections",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Personal collections", {
          type: "object",
          properties: {
            collections: {
              type: "array",
              items: {
                $ref: "#/components/schemas/CollectionSummary"
              }
            },
            artworkOptions: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ArtworkSummary"
              }
            }
          }
        }),
        403: jsonResponse("Collector account required", errorSchema)
      }
    },
    post: {
      tags: ["Collector"],
      summary: "Create a personal collection",
      security: sessionOnlySecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/CollectionUpsertRequest"
            }
          }
        }
      },
      responses: {
        201: jsonResponse("Collection created", {
          type: "object",
          properties: {
            message: { type: "string" },
            collection: {
              $ref: "#/components/schemas/CollectionSummary"
            }
          }
        }),
        400: jsonResponse("Collection title is required", errorSchema),
        403: jsonResponse("Collector account required", errorSchema)
      }
    }
  },
  "/collections/me/{id}": {
    patch: {
      tags: ["Collector"],
      summary: "Update a personal collection",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/CollectionId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/CollectionUpsertRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Collection updated", {
          type: "object",
          properties: {
            message: { type: "string" },
            collection: {
              $ref: "#/components/schemas/CollectionSummary"
            }
          }
        }),
        400: jsonResponse("Collection title is required", errorSchema),
        403: jsonResponse("Collector account required", errorSchema),
        404: jsonResponse("Collection not found", errorSchema)
      }
    },
    delete: {
      tags: ["Collector"],
      summary: "Delete a personal collection",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/CollectionId" }],
      responses: {
        200: jsonResponse("Collection deleted", messageSchema),
        403: jsonResponse("Collector account required", errorSchema),
        404: jsonResponse("Collection not found", errorSchema),
        409: jsonResponse("Default favorites collection cannot be deleted", errorSchema)
      }
    }
  },
  "/collections/me/{id}/artworks": {
    post: {
      tags: ["Collector"],
      summary: "Add one artwork to a personal collection",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/CollectionId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/CollectionArtworkMutationRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artwork added to collection", {
          type: "object",
          properties: {
            message: { type: "string" },
            collection: {
              $ref: "#/components/schemas/CollectionSummary"
            }
          }
        }),
        400: jsonResponse("Invalid artwork identifier", errorSchema),
        403: jsonResponse("Collector account required", errorSchema),
        404: jsonResponse("Collection or artwork not found", errorSchema)
      }
    }
  },
  "/collections/me/{id}/artworks/{artworkId}": {
    delete: {
      tags: ["Collector"],
      summary: "Remove one artwork from a personal collection",
      security: sessionOnlySecurity,
      parameters: [
        { $ref: "#/components/parameters/CollectionId" },
        { $ref: "#/components/parameters/CollectionArtworkId" }
      ],
      responses: {
        200: jsonResponse("Artwork removed from collection", {
          type: "object",
          properties: {
            message: { type: "string" },
            collection: {
              $ref: "#/components/schemas/CollectionSummary"
            }
          }
        }),
        403: jsonResponse("Collector account required", errorSchema),
        404: jsonResponse("Collection or artwork not found", errorSchema)
      }
    }
  }
};

const artistWorkspacePaths = {
  "/artists/me": {
    get: {
      tags: ["Artist Workspace"],
      summary: "Get the authenticated artist workspace profile",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Artist workspace state", {
          type: "object",
          properties: {
            artist: {
              oneOf: [{ $ref: "#/components/schemas/ArtistSummary" }, { type: "null" }]
            },
            application: {
              oneOf: [{ $ref: "#/components/schemas/ArtistApplicationDraft" }, { type: "null" }]
            }
          }
        }),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin accounts cannot access artist application routes", errorSchema)
      }
    },
    post: {
      tags: ["Artist Workspace"],
      summary: "Submit or resubmit an artist application",
      security: sessionOnlySecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ArtistApplicationSubmitRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artist application submitted", {
          type: "object",
          properties: {
            message: { type: "string" },
            application: {
              $ref: "#/components/schemas/ArtistApplicationDraft"
            },
            user: {
              $ref: "#/components/schemas/AuthUser"
            }
          }
        }),
        400: jsonResponse("Invalid artist application request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin accounts cannot access artist application routes", errorSchema),
        409: jsonResponse("Artist application already pending or approved", errorSchema)
      }
    }
  },
  "/artists/me/profile": {
    patch: {
      tags: ["Artist Workspace"],
      summary: "Update the authenticated artist public profile and avatar",
      security: sessionAndCsrfSecurity,
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              $ref: "#/components/schemas/ArtistProfileUpdateRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artist profile updated", {
          type: "object",
          properties: {
            message: { type: "string" },
            artist: {
              $ref: "#/components/schemas/ArtistSummary"
            }
          }
        }),
        400: jsonResponse("Invalid artist profile update request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("CSRF validation failed or admin account denied", errorSchema),
        404: jsonResponse("Artist profile not found", errorSchema)
      }
    }
  },
  "/artists/me/cover": {
    patch: {
      tags: ["Artist Workspace"],
      summary: "Update the authenticated artist hero cover image",
      security: sessionAndCsrfSecurity,
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              $ref: "#/components/schemas/ArtistCoverUpdateRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artist cover updated", {
          type: "object",
          properties: {
            message: { type: "string" },
            artist: {
              $ref: "#/components/schemas/ArtistSummary"
            }
          }
        }),
        400: jsonResponse("Invalid artist cover update request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("CSRF validation failed or admin account denied", errorSchema),
        404: jsonResponse("Artist profile not found", errorSchema)
      }
    }
  },
  "/artists/me/dashboard": {
    get: {
      tags: ["Artist Workspace"],
      summary: "Get artist sales dashboard",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Artist dashboard payload", {
          $ref: "#/components/schemas/ArtistDashboardResponse"
        }),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Verified artist account required", errorSchema)
      }
    }
  },
  "/artists/me/sales": {
    get: {
      tags: ["Artist Workspace"],
      summary: "Get artist sales journal",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Artist sales journal", {
          $ref: "#/components/schemas/ArtistSalesResponse"
        }),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Verified artist account required", errorSchema)
      }
    }
  },
  "/artists/me/withdrawals": {
    get: {
      tags: ["Artist Workspace"],
      summary: "Get the authenticated artist withdrawal workspace",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Artist withdrawal workspace", {
          $ref: "#/components/schemas/ArtistWithdrawalWorkspaceResponse"
        }),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Verified artist account required", errorSchema)
      }
    },
    post: {
      tags: ["Artist Workspace"],
      summary: "Create a new artist withdrawal request",
      security: sessionAndCsrfSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ArtistWithdrawalRequest"
            }
          }
        }
      },
      responses: {
        201: jsonResponse("Withdrawal request submitted", {
          type: "object",
          properties: {
            message: { type: "string" },
            withdrawal: {
              $ref: "#/components/schemas/ArtistWithdrawalSummary"
            }
          }
        }),
        400: jsonResponse("Invalid withdrawal request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Verified artist account required", errorSchema),
        409: jsonResponse("Withdrawal request not allowed in the current state", errorSchema)
      }
    }
  },
  "/artists/me/withdrawals/{publicId}/cancel": {
    patch: {
      tags: ["Artist Workspace"],
      summary: "Cancel one pending artist withdrawal request",
      security: sessionAndCsrfSecurity,
      parameters: [
        {
          name: "publicId",
          in: "path",
          required: true,
          description: "Withdrawal public UUID.",
          schema: {
            type: "string",
            format: "uuid"
          }
        }
      ],
      responses: {
        200: jsonResponse("Withdrawal request canceled", {
          type: "object",
          properties: {
            message: { type: "string" },
            withdrawal: {
              $ref: "#/components/schemas/ArtistWithdrawalSummary"
            }
          }
        }),
        400: jsonResponse("Invalid withdrawal request id", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Verified artist account required", errorSchema),
        404: jsonResponse("Withdrawal request not found", errorSchema),
        409: jsonResponse("Withdrawal request cannot be canceled", errorSchema)
      }
    }
  },
  "/artists/me/followers": {
    get: {
      tags: ["Artist Workspace"],
      summary: "List the followers of the authenticated artist profile",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Artist followers", {
          type: "object",
          properties: {
            followers: {
              type: "array",
              items: genericObjectSchema
            }
          }
        }),
        401: jsonResponse("Authentication required", errorSchema),
        404: jsonResponse("Artist profile not found", errorSchema)
      }
    }
  },
  "/artists/me/contract-preview": {
    post: {
      tags: ["Artist Workspace"],
      summary: "Generate the current artist contract preview",
      security: sessionOnlySecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ArtistApplicationPayload"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artist contract preview", {
          type: "object",
          properties: {
            contractText: { type: "string" },
            contractVersion: { type: "string" }
          }
        }),
        400: jsonResponse("Invalid artist application payload", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        409: jsonResponse("Artist application already pending or approved", errorSchema)
      }
    }
  },
  "/artists/me/application-draft": {
    get: {
      tags: ["Artist Workspace"],
      summary: "Get the saved artist application draft",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Current artist draft", {
          type: "object",
          properties: {
            draft: {
              oneOf: [{ $ref: "#/components/schemas/ArtistApplicationDraft" }, { type: "null" }]
            }
          }
        }),
        401: jsonResponse("Authentication required", errorSchema)
      }
    },
    patch: {
      tags: ["Artist Workspace"],
      summary: "Save the artist application draft",
      security: sessionOnlySecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ArtistApplicationDraftSaveRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Draft saved", {
          type: "object",
          properties: {
            message: { type: "string" },
            draft: {
              $ref: "#/components/schemas/ArtistApplicationDraft"
            }
          }
        }),
        400: jsonResponse("Invalid draft payload", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        409: jsonResponse("Artist application already pending or approved", errorSchema)
      }
    }
  },
  "/artists/me/contract.pdf": {
    get: {
      tags: ["Artist Workspace"],
      summary: "Open or download the signed artist contract PDF",
      security: sessionOnlySecurity,
      parameters: [
        {
          name: "download",
          in: "query",
          schema: { type: "string" },
          description: "Use true, yes or 1 to force download instead of inline preview."
        }
      ],
      responses: {
        200: binaryResponse("Signed artist contract PDF"),
        401: jsonResponse("Authentication required", errorSchema),
        404: jsonResponse("Artist contract not found", errorSchema),
        500: jsonResponse("Artist contract unavailable", errorSchema)
      }
    }
  },
  "/artists/me/artworks": {
    get: {
      tags: ["Artist Workspace"],
      summary: "List the authenticated artist artworks",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Artist artworks", {
          type: "object",
          properties: {
            artworks: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ArtworkSummary"
              }
            }
          }
        }),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Verified artist account required", errorSchema)
      }
    },
    post: {
      tags: ["Artist Workspace"],
      summary: "Publish a new artwork",
      security: sessionOnlySecurity,
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["title", "categoryId", "price", "licenseType", "image"],
              properties: {
                title: { type: "string" },
                description: {
                  type: "string",
                  description:
                    "Required for COMMERCIAL licences and must specify the commercial usage terms."
                },
                categoryId: { type: "integer", minimum: 1 },
                price: { type: "string" },
                licenseType: {
                  type: "string",
                  enum: ["PERSONAL", "COMMERCIAL", "EXCLUSIVE"]
                },
                protection: { type: "boolean" },
                image: { type: "string", format: "binary" }
              }
            }
          }
        }
      },
      responses: {
        201: jsonResponse("Artwork published", {
          type: "object",
          properties: {
            message: { type: "string" },
            artwork: {
              $ref: "#/components/schemas/ArtworkSummary"
            }
          }
        }),
        400: jsonResponse("Invalid artwork payload", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Verified artist account required", errorSchema)
      }
    }
  },
  "/artists/me/artworks/{id}": {
    get: {
      tags: ["Artist Workspace"],
      summary: "Get one owned artwork with private management capabilities",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/ArtworkId" }],
      responses: {
        200: jsonResponse("Owned artwork", {
          type: "object",
          properties: {
            artwork: { $ref: "#/components/schemas/ArtworkSummary" }
          }
        }),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Verified artist account required", errorSchema),
        404: jsonResponse("Artwork not found", errorSchema)
      }
    },
    patch: {
      tags: ["Artist Workspace"],
      summary: "Update one artist artwork",
      security: sessionAndCsrfSecurity,
      parameters: [{ $ref: "#/components/parameters/ArtworkId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ArtworkUpsertRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artwork updated", {
          type: "object",
          properties: {
            message: { type: "string" },
            artwork: {
              $ref: "#/components/schemas/ArtworkSummary"
            }
          }
        }),
        400: jsonResponse("Invalid artwork payload", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Verified artist account required", errorSchema),
        404: jsonResponse("Artwork not found", errorSchema)
      }
    },
    delete: {
      tags: ["Artist Workspace"],
      summary: "Delete one artist artwork",
      security: sessionAndCsrfSecurity,
      parameters: [{ $ref: "#/components/parameters/ArtworkId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["expectedVersion"],
              properties: {
                expectedVersion: { type: "integer", minimum: 1 }
              }
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artwork deleted", messageSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Verified artist account required", errorSchema),
        404: jsonResponse("Artwork not found", errorSchema)
      }
    }
  },
  "/artists/me/artworks/{id}/hide": {
    post: {
      tags: ["Artist Workspace"],
      summary: "Hide a published artwork from public spaces and new checkouts",
      security: sessionAndCsrfSecurity,
      parameters: [{ $ref: "#/components/parameters/ArtworkId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["expectedVersion"],
              properties: {
                expectedVersion: { type: "integer", minimum: 1 }
              }
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artwork hidden", genericObjectSchema),
        400: jsonResponse("Artwork version required", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Verified artist account required", errorSchema),
        404: jsonResponse("Artwork not found", errorSchema),
        409: jsonResponse("Artwork lifecycle conflict", errorSchema)
      }
    }
  },
  "/artists/me/artworks/{id}/publish": {
    post: {
      tags: ["Artist Workspace"],
      summary: "Republish a hidden, moderation-approved artwork",
      security: sessionAndCsrfSecurity,
      parameters: [{ $ref: "#/components/parameters/ArtworkId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["expectedVersion"],
              properties: {
                expectedVersion: { type: "integer", minimum: 1 }
              }
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artwork republished", genericObjectSchema),
        400: jsonResponse("Artwork version required", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Verified artist account required", errorSchema),
        404: jsonResponse("Artwork not found", errorSchema),
        409: jsonResponse("Artwork lifecycle or moderation conflict", errorSchema)
      }
    }
  },
  "/artists/me/artworks/{id}/archive": {
    post: {
      tags: ["Artist Workspace"],
      summary: "Archive an artwork while preserving its commercial history and buyer rights",
      security: sessionAndCsrfSecurity,
      parameters: [{ $ref: "#/components/parameters/ArtworkId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["expectedVersion"],
              properties: {
                expectedVersion: { type: "integer", minimum: 1 }
              }
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artwork archived", genericObjectSchema),
        400: jsonResponse("Artwork version required", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Verified artist account required", errorSchema),
        404: jsonResponse("Artwork not found", errorSchema),
        409: jsonResponse("Artwork transaction or version conflict", errorSchema)
      }
    }
  },
  "/artists/me/artworks/{id}/restore": {
    post: {
      tags: ["Artist Workspace"],
      summary: "Restore an archived artwork to the private hidden state",
      security: sessionAndCsrfSecurity,
      parameters: [{ $ref: "#/components/parameters/ArtworkId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["expectedVersion"],
              properties: {
                expectedVersion: { type: "integer", minimum: 1 }
              }
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artwork restored as hidden", genericObjectSchema),
        400: jsonResponse("Artwork version required", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Verified artist account required", errorSchema),
        404: jsonResponse("Artwork not found", errorSchema),
        409: jsonResponse("Artwork lifecycle or version conflict", errorSchema)
      }
    }
  }
};

const checkoutPaths = {
  "/orders/checkout": {
    post: {
      tags: ["Checkout"],
      summary: "Legacy checkout endpoint",
      description:
        "Older non-v1 checkout flow kept for compatibility. The current production-grade Stripe flow is /v1/orders/checkout.",
      security: sessionOnlySecurity,
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/LegacyCheckoutRequest"
            }
          }
        }
      },
      responses: {
        201: jsonResponse("Legacy checkout completed", genericObjectSchema),
        400: jsonResponse("Invalid checkout request", errorSchema),
        403: jsonResponse("Admin accounts cannot place orders", errorSchema),
        404: jsonResponse("Artwork not found", errorSchema),
        409: jsonResponse("Artwork already sold", errorSchema)
      }
    }
  },
  "/orders": {
    get: {
      tags: ["Checkout"],
      summary: "List legacy order history",
      description: "Legacy order listing route used by older frontend flows.",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Legacy orders", {
          type: "object",
          properties: {
            orders: {
              type: "array",
              items: genericObjectSchema
            }
          }
        }),
        401: jsonResponse("Authentication required", errorSchema)
      }
    }
  },
  "/orders/{id}": {
    get: {
      tags: ["Checkout"],
      summary: "Get one legacy order detail",
      description: "Legacy order detail route indexed by numeric order identifier.",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/LegacyOrderId" }],
      responses: {
        200: jsonResponse("Legacy order detail", {
          type: "object",
          properties: {
            order: genericObjectSchema
          }
        }),
        400: jsonResponse("Invalid order id", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        404: jsonResponse("Order not found", errorSchema)
      }
    }
  },
  "/v1/cart": {
    get: {
      tags: ["Checkout"],
      summary: "Get current cart summary",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Cart summary", {
          type: "object",
          properties: {
            cart: {
              $ref: "#/components/schemas/CartSummary"
            }
          }
        }),
        401: jsonResponse("Authentication required", errorSchema)
      }
    },
    delete: {
      tags: ["Checkout"],
      summary: "Clear the current cart",
      security: sessionAndCsrfSecurity,
      responses: {
        200: jsonResponse("Cart cleared", {
          type: "object",
          properties: {
            cart: {
              $ref: "#/components/schemas/CartSummary"
            }
          }
        }),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("CSRF validation failed", errorSchema)
      }
    }
  },
  "/v1/cart/items": {
    post: {
      tags: ["Checkout"],
      summary: "Add or replace a cart item quantity",
      security: sessionAndCsrfSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["artworkId"],
              properties: {
                artworkId: { type: "integer", minimum: 1 },
                quantity: { type: "integer", minimum: 1, maximum: 100 }
              }
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Cart item saved", {
          type: "object",
          properties: {
            cart: {
              $ref: "#/components/schemas/CartSummary"
            }
          }
        }),
        400: jsonResponse("Invalid cart item request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("CSRF validation failed", errorSchema)
      }
    }
  },
  "/v1/cart/items/{artworkId}": {
    delete: {
      tags: ["Checkout"],
      summary: "Remove one artwork from the cart",
      security: sessionAndCsrfSecurity,
      parameters: [
        {
          name: "artworkId",
          in: "path",
          required: true,
          schema: {
            type: "integer",
            minimum: 1
          }
        }
      ],
      responses: {
        200: jsonResponse("Cart item removed", {
          type: "object",
          properties: {
            cart: {
              $ref: "#/components/schemas/CartSummary"
            }
          }
        }),
        400: jsonResponse("Invalid cart item identifier", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("CSRF validation failed", errorSchema)
      }
    }
  },
  "/v1/cart/validate": {
    post: {
      tags: ["Checkout"],
      summary: "Validate a cart snapshot for checkout",
      security: sessionAndCsrfSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["cartVersion", "pricingFingerprint"],
              properties: {
                cartVersion: { type: "integer", minimum: 1 },
                pricingFingerprint: {
                  type: "string",
                  pattern: "^[a-f0-9]{64}$"
                }
              }
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Cart is valid for checkout", {
          type: "object",
          properties: {
            valid: { type: "boolean" },
            cart: {
              $ref: "#/components/schemas/CartSummary"
            }
          }
        }),
        400: jsonResponse("Invalid cart validation request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("CSRF validation failed", errorSchema)
      }
    }
  },
  "/v1/security/csrf-token": {
    get: {
      tags: ["Checkout"],
      summary: "Issue a CSRF token for secured /v1 mutations",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("CSRF token issued", {
          type: "object",
          properties: {
            csrfToken: { type: "string" }
          }
        }),
        401: jsonResponse("Authentication required", errorSchema)
      }
    }
  },
  "/v1/orders/checkout": {
    post: {
      tags: ["Checkout"],
      summary: "Initialize the secure Stripe checkout",
      security: sessionAndCsrfSecurity,
      parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/OrderCheckoutRequest"
            }
          }
        }
      },
      responses: {
        201: jsonResponse("Checkout initialized", {
          $ref: "#/components/schemas/OrderCheckoutResponse"
        }),
        200: jsonResponse("Existing idempotent checkout returned", {
          $ref: "#/components/schemas/OrderCheckoutResponse"
        }),
        400: jsonResponse("Invalid checkout request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("CSRF validation failed or commerce policy denied", errorSchema),
        503: jsonResponse("Payment provider not configured", errorSchema)
      }
    }
  },
  "/v1/orders/{publicId}/resume": {
    post: {
      tags: ["Checkout"],
      summary: "Resume an existing checkout",
      security: sessionAndCsrfSecurity,
      parameters: [{ $ref: "#/components/parameters/OrderPublicId" }],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: false
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Checkout resumed", {
          $ref: "#/components/schemas/OrderCheckoutResponse"
        }),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("CSRF validation failed", errorSchema),
        404: jsonResponse("Order not found", errorSchema)
      }
    }
  },
  "/v1/orders": {
    get: {
      tags: ["Checkout"],
      summary: "List the authenticated user secure order history",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Orders list", {
          type: "object",
          properties: {
            orders: genericArraySchema
          }
        }),
        401: jsonResponse("Authentication required", errorSchema)
      }
    }
  },
  "/v1/orders/{publicId}": {
    get: {
      tags: ["Checkout"],
      summary: "Get one authenticated user secure order",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/OrderPublicId" }],
      responses: {
        200: jsonResponse("Order detail", {
          type: "object",
          properties: {
            order: genericObjectSchema
          }
        }),
        401: jsonResponse("Authentication required", errorSchema),
        404: jsonResponse("Order not found", errorSchema)
      }
    }
  },
  "/v1/orders/{publicId}/invoices/{invoicePublicId}.pdf": {
    get: {
      tags: ["Checkout"],
      summary: "Download one owned invoice PDF",
      security: sessionOnlySecurity,
      parameters: [
        { $ref: "#/components/parameters/OrderPublicId" },
        { $ref: "#/components/parameters/InvoicePublicId" }
      ],
      responses: {
        200: binaryResponse("Invoice PDF"),
        401: jsonResponse("Authentication required", errorSchema),
        404: jsonResponse("Invoice not found", errorSchema)
      }
    }
  },
  "/v1/orders/{publicId}/download/{itemId}": {
    get: {
      tags: ["Checkout"],
      summary: "Download an owned artwork file",
      security: sessionOnlySecurity,
      parameters: [
        { $ref: "#/components/parameters/OrderPublicId" },
        {
          name: "itemId",
          in: "path",
          required: true,
          schema: { type: "integer", minimum: 1 }
        }
      ],
      responses: {
        200: binaryResponse("Original artwork file"),
        401: jsonResponse("Authentication required", errorSchema),
        404: jsonResponse("Artwork file not found", errorSchema),
        410: jsonResponse("Download access expired", errorSchema),
        429: jsonResponse("Too many download attempts", errorSchema)
      }
    }
  }
};

const notificationPaths = {
  "/notifications/me": {
    get: {
      tags: ["Notifications"],
      summary: "List current user notifications",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Notifications list", {
          type: "object",
          properties: {
            unreadCount: { type: "integer" },
            notifications: {
              type: "array",
              items: {
                $ref: "#/components/schemas/NotificationSummary"
              }
            }
          }
        }),
        401: jsonResponse("Authentication required", errorSchema)
      }
    }
  },
  "/notifications/me/read-all": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark all notifications as read",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Notifications marked as read", {
          type: "object",
          properties: {
            message: { type: "string" },
            updatedCount: { type: "integer" }
          }
        }),
        401: jsonResponse("Authentication required", errorSchema)
      }
    }
  },
  "/notifications/{id}/read": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark one notification as read",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/NotificationId" }],
      responses: {
        200: jsonResponse("Notification marked as read", {
          type: "object",
          properties: {
            message: { type: "string" },
            notification: {
              $ref: "#/components/schemas/NotificationSummary"
            }
          }
        }),
        400: jsonResponse("Invalid notification identifier", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        404: jsonResponse("Notification not found", errorSchema)
      }
    }
  }
};

const adminPaths = {
  "/admin/forensic-watermark/decode": {
    post: {
      tags: ["Admin"],
      summary: "Decode a forensic watermark from an artwork image",
      security: [{ cookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["image"],
              properties: { image: { type: "string", format: "binary" } }
            }
          }
        }
      },
      responses: {
        200: { description: "Forensic watermark decoded." },
        400: { description: "Invalid image or undecodable watermark." },
        401: { description: "Authentication required." },
        403: { description: "Administrator access required." }
      }
    }
  },
  "/admin/dashboard": {
    get: {
      tags: ["Admin"],
      summary: "Get the admin operational dashboard",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Admin dashboard payload", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema)
      }
    }
  },
  "/admin/categories": {
    get: {
      tags: ["Admin"],
      summary: "List homepage category visuals for administration",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Admin categories payload", {
          type: "object",
          properties: {
            summary: {
              type: "object",
              properties: {
                totalCategories: { type: "integer" },
                categoriesWithImage: { type: "integer" },
                totalArtworks: { type: "integer" }
              }
            },
            categories: {
              type: "array",
              items: {
                $ref: "#/components/schemas/CategorySummary"
              }
            }
          }
        }),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema)
      }
    }
  },
  "/admin/categories/{categoryId}/image": {
    patch: {
      tags: ["Admin"],
      summary: "Upload or remove the homepage image for one category",
      security: sessionAndCsrfSecurity,
      parameters: [
        {
          name: "categoryId",
          in: "path",
          required: true,
          schema: {
            type: "integer",
            minimum: 1
          }
        }
      ],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              $ref: "#/components/schemas/AdminCategoryImageUpdateRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Category image updated", {
          type: "object",
          properties: {
            message: { type: "string" },
            category: {
              $ref: "#/components/schemas/CategorySummary"
            }
          }
        }),
        400: jsonResponse("Invalid category image update request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required or CSRF validation failed", errorSchema),
        404: jsonResponse("Category not found", errorSchema)
      }
    }
  },
  "/admin/users": {
    get: {
      tags: ["Admin"],
      summary: "List users for admin operations",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Admin users payload", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema)
      }
    }
  },
  "/admin/users/admins": {
    post: {
      tags: ["Admin"],
      summary: "Invite a new admin or super admin",
      security: sessionOnlySecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["username", "email"],
              properties: {
                username: { type: "string" },
                email: { type: "string", format: "email" },
                phone: { type: "string", nullable: true },
                isSuperAdmin: { type: "boolean" }
              }
            }
          }
        }
      },
      responses: {
        201: jsonResponse("Admin invitation sent", {
          type: "object",
          properties: {
            message: { type: "string" },
            user: genericObjectSchema
          }
        }),
        400: jsonResponse("Username and email are required", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Super admin role required", errorSchema),
        409: jsonResponse("Email already in use", errorSchema)
      }
    }
  },
  "/admin/users/{userId}": {
    get: {
      tags: ["Admin"],
      summary: "Get one user detail for administration",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/UserId" }],
      responses: {
        200: jsonResponse("Admin user detail", genericObjectSchema),
        400: jsonResponse("Invalid user id", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        404: jsonResponse("User not found", errorSchema)
      }
    }
  },
  "/admin/users/{userId}/account-status": {
    patch: {
      tags: ["Admin"],
      summary: "Suspend, block or reactivate a user account",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/UserId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AdminUserStatusRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("User account status updated", {
          type: "object",
          properties: {
            message: { type: "string" },
            user: genericObjectSchema
          }
        }),
        400: jsonResponse("Invalid account status request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        404: jsonResponse("User not found", errorSchema)
      }
    }
  },
  "/admin/users/{userId}/admin-access": {
    patch: {
      tags: ["Admin"],
      summary: "Remove admin or super admin access from a user",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/UserId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AdminUserAdminAccessRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Admin access updated", {
          type: "object",
          properties: {
            message: { type: "string" },
            user: genericObjectSchema
          }
        }),
        400: jsonResponse("Invalid admin access action", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Insufficient admin permissions", errorSchema),
        404: jsonResponse("User not found", errorSchema)
      }
    }
  },
  "/admin/artists": {
    get: {
      tags: ["Admin"],
      summary: "List artist profiles for administration",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Admin artist payload", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema)
      }
    }
  },
  "/admin/artists/{id}": {
    get: {
      tags: ["Admin"],
      summary: "Get one artist detail for administration",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/ArtistId" }],
      responses: {
        200: jsonResponse("Admin artist detail", genericObjectSchema),
        400: jsonResponse("Invalid artist id", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        404: jsonResponse("Artist profile not found", errorSchema)
      }
    }
  },
  "/admin/artists/{id}/verification": {
    patch: {
      tags: ["Admin"],
      summary: "Verify or unverify an artist profile",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/ArtistId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AdminArtistVerificationRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artist verification updated", {
          type: "object",
          properties: {
            message: { type: "string" },
            artist: genericObjectSchema
          }
        }),
        400: jsonResponse("Invalid verification request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        404: jsonResponse("Artist profile not found", errorSchema)
      }
    }
  },
  "/admin/artist-applications": {
    get: {
      tags: ["Admin"],
      summary: "List artist applications awaiting review",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Artist applications payload", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema)
      }
    }
  },
  "/admin/artist-applications/{id}": {
    patch: {
      tags: ["Admin"],
      summary: "Approve or reject an artist application",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/ApplicationId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AdminArtistApplicationReviewRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artist application reviewed", {
          type: "object",
          properties: {
            message: { type: "string" },
            application: genericObjectSchema
          }
        }),
        400: jsonResponse("Invalid artist application review request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        404: jsonResponse("Artist application not found", errorSchema)
      }
    }
  },
  "/admin/artist-applications/{id}/contract.pdf": {
    get: {
      tags: ["Admin"],
      summary: "Open the signed contract PDF attached to an artist application",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/ApplicationId" }],
      responses: {
        200: binaryResponse("Artist application contract PDF"),
        400: jsonResponse("Invalid artist application id", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        404: jsonResponse("Artist contract not found", errorSchema)
      }
    }
  },
  "/admin/artworks": {
    get: {
      tags: ["Admin"],
      summary: "List artworks for moderation",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Admin artworks payload", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema)
      }
    }
  },
  "/admin/artworks/{id}/moderation": {
    patch: {
      tags: ["Admin"],
      summary: "Update artwork moderation status",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/ArtworkId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AdminArtworkModerationRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artwork moderation updated", {
          type: "object",
          properties: {
            message: { type: "string" },
            artwork: genericObjectSchema
          }
        }),
        400: jsonResponse("Invalid moderation request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        404: jsonResponse("Artwork not found", errorSchema)
      }
    }
  },
  "/admin/orders": {
    get: {
      tags: ["Admin"],
      summary: "List orders for administration",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Admin orders payload", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema)
      }
    }
  },
  "/admin/orders/{publicId}": {
    get: {
      tags: ["Admin"],
      summary: "Get one order detail for administration",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/OrderPublicId" }],
      responses: {
        200: jsonResponse("Admin order detail", genericObjectSchema),
        400: jsonResponse("Invalid order id", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        404: jsonResponse("Order not found", errorSchema)
      }
    }
  },
  "/admin/payments": {
    get: {
      tags: ["Admin"],
      summary: "List payments for administration",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Admin payments payload", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema)
      }
    }
  },
  "/admin/payments/{id}": {
    get: {
      tags: ["Admin"],
      summary: "Get one payment detail for administration",
      security: sessionOnlySecurity,
      parameters: [{ $ref: "#/components/parameters/PaymentId" }],
      responses: {
        200: jsonResponse("Admin payment detail", genericObjectSchema),
        400: jsonResponse("Invalid payment id", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        404: jsonResponse("Payment not found", errorSchema)
      }
    }
  },
  "/admin/artist-withdrawals": {
    get: {
      tags: ["Admin"],
      summary: "List artist withdrawal requests for manual payout operations",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Admin artist withdrawals payload", {
          type: "object",
          properties: {
            summary: { type: "object", additionalProperties: true },
            withdrawals: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ArtistWithdrawalSummary"
              }
            }
          }
        }),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema)
      }
    }
  },
  "/admin/artist-withdrawals/{publicId}": {
    patch: {
      tags: ["Admin"],
      summary: "Approve, reject or mark one artist withdrawal as paid",
      security: sessionAndCsrfSecurity,
      parameters: [
        {
          name: "publicId",
          in: "path",
          required: true,
          description: "Withdrawal public UUID.",
          schema: {
            type: "string",
            format: "uuid"
          }
        }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/AdminArtistWithdrawalActionRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Artist withdrawal updated", {
          type: "object",
          properties: {
            message: { type: "string" },
            withdrawal: {
              $ref: "#/components/schemas/ArtistWithdrawalSummary"
            }
          }
        }),
        400: jsonResponse("Invalid withdrawal action", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        404: jsonResponse("Withdrawal request not found", errorSchema),
        409: jsonResponse("Withdrawal transition not allowed", errorSchema)
      }
    }
  },
  "/admin/audit-log": {
    get: {
      tags: ["Admin"],
      summary: "List admin audit log entries",
      security: sessionOnlySecurity,
      parameters: [
        {
          name: "entityType",
          in: "query",
          schema: { type: "string" },
          description: "Audit entity type filter."
        },
        {
          name: "entityId",
          in: "query",
          schema: { type: "string" },
          description: "Entity identifier filter."
        },
        {
          name: "actorUserId",
          in: "query",
          schema: { type: "integer", minimum: 1 },
          description: "Actor user identifier filter."
        },
        {
          name: "action",
          in: "query",
          schema: { type: "string" },
          description: "Action text filter."
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 120 },
          description: "Maximum number of audit entries."
        }
      ],
      responses: {
        200: jsonResponse("Audit log payload", genericObjectSchema),
        400: jsonResponse("Invalid audit log filter", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema)
      }
    }
  }
};

const adminAnalyticsPaths = {
  "/admin/analytics/overview": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Get aggregated Umami overview metrics",
      security: sessionOnlySecurity,
      parameters: analyticsRangeParameters,
      responses: {
        200: jsonResponse("Analytics overview", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        502: jsonResponse("Analytics provider unavailable", errorSchema)
      }
    }
  },
  "/admin/analytics/active": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Get active visitor count",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Active visitor count", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        502: jsonResponse("Analytics provider unavailable", errorSchema)
      }
    }
  },
  "/admin/analytics/timeseries": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Get time-series analytics data",
      security: sessionOnlySecurity,
      parameters: analyticsTimeseriesParameters,
      responses: {
        200: jsonResponse("Time-series analytics payload", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        502: jsonResponse("Analytics provider unavailable", errorSchema)
      }
    }
  },
  "/admin/analytics/pages": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Get top pages analytics",
      security: sessionOnlySecurity,
      parameters: analyticsMetricParameters,
      responses: {
        200: jsonResponse("Ranked pages analytics", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        502: jsonResponse("Analytics provider unavailable", errorSchema)
      }
    }
  },
  "/admin/analytics/referrers": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Get top referrers analytics",
      security: sessionOnlySecurity,
      parameters: analyticsMetricParameters,
      responses: {
        200: jsonResponse("Ranked referrers analytics", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        502: jsonResponse("Analytics provider unavailable", errorSchema)
      }
    }
  },
  "/admin/analytics/browsers": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Get top browsers analytics",
      security: sessionOnlySecurity,
      parameters: analyticsMetricParameters,
      responses: {
        200: jsonResponse("Ranked browsers analytics", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        502: jsonResponse("Analytics provider unavailable", errorSchema)
      }
    }
  },
  "/admin/analytics/os": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Get top operating systems analytics",
      security: sessionOnlySecurity,
      parameters: analyticsMetricParameters,
      responses: {
        200: jsonResponse("Ranked operating systems analytics", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        502: jsonResponse("Analytics provider unavailable", errorSchema)
      }
    }
  },
  "/admin/analytics/devices": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Get top devices analytics",
      security: sessionOnlySecurity,
      parameters: analyticsMetricParameters,
      responses: {
        200: jsonResponse("Ranked devices analytics", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        502: jsonResponse("Analytics provider unavailable", errorSchema)
      }
    }
  },
  "/admin/analytics/countries": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Get top countries analytics",
      security: sessionOnlySecurity,
      parameters: analyticsMetricParameters,
      responses: {
        200: jsonResponse("Ranked countries analytics", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        502: jsonResponse("Analytics provider unavailable", errorSchema)
      }
    }
  },
  "/admin/analytics/events": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Get top event analytics",
      security: sessionOnlySecurity,
      parameters: analyticsMetricParameters,
      responses: {
        200: jsonResponse("Ranked events analytics", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        502: jsonResponse("Analytics provider unavailable", errorSchema)
      }
    }
  },
  "/admin/analytics/utm-sources": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Get top UTM sources analytics",
      security: sessionOnlySecurity,
      parameters: analyticsMetricParameters,
      responses: {
        200: jsonResponse("Ranked UTM sources analytics", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        502: jsonResponse("Analytics provider unavailable", errorSchema)
      }
    }
  },
  "/admin/analytics/utm-mediums": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Get top UTM mediums analytics",
      security: sessionOnlySecurity,
      parameters: analyticsMetricParameters,
      responses: {
        200: jsonResponse("Ranked UTM mediums analytics", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        502: jsonResponse("Analytics provider unavailable", errorSchema)
      }
    }
  },
  "/admin/analytics/utm-campaigns": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Get top UTM campaigns analytics",
      security: sessionOnlySecurity,
      parameters: analyticsMetricParameters,
      responses: {
        200: jsonResponse("Ranked UTM campaigns analytics", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        502: jsonResponse("Analytics provider unavailable", errorSchema)
      }
    }
  },
  "/admin/analytics/funnels": {
    get: {
      tags: ["Admin Analytics"],
      summary: "List configured analytics funnels",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Configured funnels", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema)
      }
    }
  },
  "/admin/analytics/funnels/{key}": {
    get: {
      tags: ["Admin Analytics"],
      summary: "Compute one analytics funnel",
      security: sessionOnlySecurity,
      parameters: [...analyticsRangeParameters, { $ref: "#/components/parameters/FunnelKey" }],
      responses: {
        200: jsonResponse("Computed funnel payload", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema),
        404: jsonResponse("Funnel not found", errorSchema),
        502: jsonResponse("Analytics provider unavailable", errorSchema)
      }
    }
  }
};

const paymentOperationsPaths = {
  "/v1/admin/payments/anomalies": {
    get: {
      tags: ["Payment Operations"],
      summary: "List payment anomalies and unresolved operations",
      security: sessionOnlySecurity,
      responses: {
        200: jsonResponse("Payment anomalies payload", genericObjectSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Admin role required", errorSchema)
      }
    }
  },
  "/v1/admin/orders/{publicId}/refunds": {
    post: {
      tags: ["Payment Operations"],
      summary: "Create or replay an admin refund request",
      security: sessionAndCsrfSecurity,
      parameters: [
        { $ref: "#/components/parameters/OrderPublicId" },
        { $ref: "#/components/parameters/IdempotencyKey" }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/RefundRequest"
            }
          }
        }
      },
      responses: {
        202: jsonResponse("Refund queued or created", genericObjectSchema),
        200: jsonResponse("Existing idempotent refund returned", genericObjectSchema),
        400: jsonResponse("Invalid refund request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse("Refund permission required or CSRF validation failed", errorSchema),
        404: jsonResponse("Order not found", errorSchema)
      }
    }
  },
  "/v1/admin/payments/anomalies/tasks/{taskId}/replay": {
    post: {
      tags: ["Payment Operations"],
      summary: "Requeue one fulfillment task anomaly",
      security: sessionAndCsrfSecurity,
      parameters: [{ $ref: "#/components/parameters/TaskId" }],
      responses: {
        202: jsonResponse("Fulfillment task queued for replay", genericObjectSchema),
        200: jsonResponse("Fulfillment task replay acknowledged", genericObjectSchema),
        400: jsonResponse("Invalid fulfillment task replay request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse(
          "Payment operations permission required or CSRF validation failed",
          errorSchema
        )
      }
    }
  },
  "/v1/admin/payments/anomalies/webhooks/{eventId}/replay": {
    post: {
      tags: ["Payment Operations"],
      summary: "Replay one persisted Stripe webhook event",
      security: sessionAndCsrfSecurity,
      parameters: [{ $ref: "#/components/parameters/WebhookEventId" }],
      responses: {
        200: jsonResponse("Stripe webhook replay result", genericObjectSchema),
        400: jsonResponse("Invalid webhook replay request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse(
          "Payment operations permission required or CSRF validation failed",
          errorSchema
        )
      }
    }
  },
  "/v1/admin/payments/anomalies/orders/{publicId}/reconcile": {
    post: {
      tags: ["Payment Operations"],
      summary: "Reconcile one order with Stripe",
      security: sessionAndCsrfSecurity,
      parameters: [{ $ref: "#/components/parameters/OrderPublicId" }],
      responses: {
        200: jsonResponse("Order reconciliation result", genericObjectSchema),
        400: jsonResponse("Invalid reconciliation request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse(
          "Payment operations permission required or CSRF validation failed",
          errorSchema
        ),
        404: jsonResponse("Order not found", errorSchema)
      }
    }
  },
  "/v1/admin/payments/anomalies/disputes/{disputeId}/sync-evidence": {
    post: {
      tags: ["Payment Operations"],
      summary: "Synchronize dispute evidence audit information",
      security: sessionAndCsrfSecurity,
      parameters: [{ $ref: "#/components/parameters/DisputeId" }],
      responses: {
        200: jsonResponse("Dispute evidence sync result", genericObjectSchema),
        400: jsonResponse("Invalid dispute sync request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse(
          "Payment operations permission required or CSRF validation failed",
          errorSchema
        )
      }
    }
  },
  "/v1/admin/payments/anomalies/alerts/{alertId}/resolve": {
    post: {
      tags: ["Payment Operations"],
      summary: "Resolve a payment operator alert",
      security: sessionAndCsrfSecurity,
      parameters: [{ $ref: "#/components/parameters/AlertId" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ResolveAlertRequest"
            }
          }
        }
      },
      responses: {
        200: jsonResponse("Operator alert resolved", genericObjectSchema),
        400: jsonResponse("Invalid alert resolution request", errorSchema),
        401: jsonResponse("Authentication required", errorSchema),
        403: jsonResponse(
          "Payment operations permission required or CSRF validation failed",
          errorSchema
        )
      }
    }
  }
};

const webhookPaths = {
  "/v1/webhooks/stripe": {
    post: {
      tags: ["Webhooks"],
      summary: "Receive signed Stripe webhook events",
      description:
        "This endpoint must receive the exact raw request body signed by Stripe. It is mounted before body parsing middleware in the backend.",
      parameters: [
        {
          name: "stripe-signature",
          in: "header",
          required: true,
          schema: { type: "string" },
          description: "Stripe signature header."
        }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: genericObjectSchema
          }
        }
      },
      responses: {
        200: jsonResponse("Webhook accepted", {
          type: "object",
          properties: {
            received: { type: "boolean" },
            duplicate: { type: "boolean" },
            ignored: { type: "boolean" }
          }
        }),
        400: jsonResponse("Invalid Stripe signature or payload", errorSchema),
        500: jsonResponse("Webhook persistence failed", errorSchema)
      }
    }
  }
};

const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Make It Art Business API",
    version: "1.0.0",
    description:
      "Business-oriented API documentation for the Make It Art marketplace. " +
      "This specification now covers the routed backend surface exposed through the application, " +
      "including authentication, marketplace, collector features, artist workspace, admin operations, " +
      "analytics, payment flows and Stripe webhooks."
  },
  servers: [
    {
      url: "/api",
      description: "Primary API namespace"
    }
  ],
  tags: [
    { name: "Platform", description: "Operational and documentation endpoints" },
    { name: "Authentication", description: "Account access and session lifecycle" },
    { name: "Marketplace", description: "Public collector-facing discovery endpoints" },
    { name: "Collector", description: "Collector favorites, follows and personal collections" },
    { name: "Artist Workspace", description: "Artist onboarding, profile, dashboard and artworks" },
    { name: "Checkout", description: "Cart, checkout, orders and invoices" },
    { name: "Notifications", description: "In-app user notifications" },
    { name: "Admin", description: "Operational back-office endpoints" },
    { name: "Admin Analytics", description: "Analytics and funnel reporting endpoints" },
    { name: "Payment Operations", description: "Admin anomaly resolution and refunds" },
    { name: "Webhooks", description: "Inbound third-party webhook endpoints" }
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: env.sessionCookieName,
        description: "Authenticated session cookie set after login."
      },
      csrfHeader: {
        type: "apiKey",
        in: "header",
        name: "x-csrf-token",
        description:
          "CSRF token required by state-changing secured endpoints protected with the CSRF middleware."
      }
    },
    parameters: {
      IdempotencyKey: {
        name: "idempotency-key",
        in: "header",
        required: true,
        description: "UUID v4 idempotency key required for checkout and refund operations.",
        schema: {
          type: "string",
          format: "uuid"
        }
      },
      OrderPublicId: {
        name: "publicId",
        in: "path",
        required: true,
        description: "Public UUID of an order.",
        schema: {
          type: "string",
          format: "uuid"
        }
      },
      InvoicePublicId: {
        name: "invoicePublicId",
        in: "path",
        required: true,
        description: "Public UUID of an invoice.",
        schema: {
          type: "string",
          format: "uuid"
        }
      },
      ArtworkId: {
        name: "id",
        in: "path",
        required: true,
        description: "Numeric artwork identifier.",
        schema: {
          type: "integer",
          minimum: 1
        }
      },
      ArtistId: {
        name: "id",
        in: "path",
        required: true,
        description: "Numeric artist identifier.",
        schema: {
          type: "integer",
          minimum: 1
        }
      },
      UserId: {
        name: "userId",
        in: "path",
        required: true,
        description: "Numeric user identifier.",
        schema: {
          type: "integer",
          minimum: 1
        }
      },
      NotificationId: {
        name: "id",
        in: "path",
        required: true,
        description: "Numeric notification identifier.",
        schema: {
          type: "integer",
          minimum: 1
        }
      },
      CollectionId: {
        name: "id",
        in: "path",
        required: true,
        description: "Numeric personal collection identifier.",
        schema: {
          type: "integer",
          minimum: 1
        }
      },
      CollectionArtworkId: {
        name: "artworkId",
        in: "path",
        required: true,
        description: "Numeric artwork identifier within a collection route.",
        schema: {
          type: "integer",
          minimum: 1
        }
      },
      LegacyOrderId: {
        name: "id",
        in: "path",
        required: true,
        description: "Legacy numeric order identifier.",
        schema: {
          type: "integer",
          minimum: 1
        }
      },
      PaymentId: {
        name: "id",
        in: "path",
        required: true,
        description: "Numeric payment identifier.",
        schema: {
          type: "integer",
          minimum: 1
        }
      },
      ApplicationId: {
        name: "id",
        in: "path",
        required: true,
        description: "Numeric artist application identifier.",
        schema: {
          type: "integer",
          minimum: 1
        }
      },
      AlertId: {
        name: "alertId",
        in: "path",
        required: true,
        description: "Numeric payment operator alert identifier.",
        schema: {
          type: "integer",
          minimum: 1
        }
      },
      TaskId: {
        name: "taskId",
        in: "path",
        required: true,
        description: "Numeric fulfillment task identifier.",
        schema: {
          type: "integer",
          minimum: 1
        }
      },
      WebhookEventId: {
        name: "eventId",
        in: "path",
        required: true,
        description: "Persisted Stripe webhook event identifier.",
        schema: {
          type: "string"
        }
      },
      DisputeId: {
        name: "disputeId",
        in: "path",
        required: true,
        description: "Stripe dispute identifier.",
        schema: {
          type: "string"
        }
      },
      FunnelKey: {
        name: "key",
        in: "path",
        required: true,
        description: "Configured analytics funnel key.",
        schema: {
          type: "string"
        }
      }
    },
    schemas: {
      MessageResponse: {
        type: "object",
        required: ["message"],
        properties: {
          message: {
            type: "string"
          }
        }
      },
      ErrorResponse: {
        type: "object",
        required: ["message"],
        properties: {
          message: {
            type: "string"
          },
          code: {
            type: "string",
            nullable: true
          },
          supportReference: {
            type: "string",
            nullable: true
          }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" }
        }
      },
      VerifyLoginCodeRequest: {
        type: "object",
        required: ["code"],
        properties: {
          code: { type: "string" },
          rememberDevice: { type: "boolean" }
        }
      },
      GoogleLinkRequest: {
        type: "object",
        required: ["password"],
        properties: {
          password: { type: "string", format: "password" }
        }
      },
      RegisterRequest: {
        type: "object",
        required: ["username", "email", "phone", "password", "confirmPassword"],
        properties: {
          username: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          password: { type: "string", format: "password" },
          confirmPassword: { type: "string", format: "password" }
        }
      },
      UpdateProfileRequest: {
        type: "object",
        properties: {
          username: { type: "string" },
          email: { type: "string", format: "email" },
          bio: { type: "string" }
        },
        additionalProperties: false
      },
      UpdatePasswordRequest: {
        type: "object",
        required: ["currentPassword", "newPassword", "confirmPassword"],
        properties: {
          currentPassword: { type: "string", format: "password" },
          newPassword: { type: "string", format: "password" },
          confirmPassword: { type: "string", format: "password" }
        }
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["token", "password", "confirmPassword"],
        properties: {
          token: { type: "string" },
          password: { type: "string", format: "password" },
          confirmPassword: { type: "string", format: "password" }
        }
      },
      AuthUser: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          username: { type: "string", nullable: true },
          bio: { type: "string", nullable: true },
          isAdmin: { type: "boolean" },
          isSuperAdmin: { type: "boolean" },
          isArtist: { type: "boolean" },
          isVerifiedArtist: { type: "boolean" },
          artistApplicationStatus: { type: "string", nullable: true }
        }
      },
      BillingDetails: {
        type: "object",
        required: [
          "customerType",
          "consumerConfirmed",
          "name",
          "addressLine1",
          "postalCode",
          "city",
          "country"
        ],
        properties: {
          customerType: { type: "string", example: "B2C" },
          consumerConfirmed: { type: "boolean", example: true },
          name: { type: "string", example: "Ada Buyer" },
          addressLine1: { type: "string", example: "1 rue de Paris" },
          addressLine2: { type: "string", nullable: true, example: "" },
          postalCode: { type: "string", example: "75001" },
          city: { type: "string", example: "Paris" },
          country: { type: "string", example: "FR" }
        }
      },
      ArtworkSummary: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          imageUrl: { type: "string", nullable: true },
          price: { type: "string", nullable: true, example: "10" },
          priceAmount: { type: "integer", nullable: true, example: 1000 },
          currency: { type: "string", example: "EUR" },
          licenseType: {
            type: "string",
            enum: ["PERSONAL", "COMMERCIAL", "EXCLUSIVE"]
          },
          isUnlimited: { type: "boolean" },
          availableQuantity: { type: "integer", nullable: true, minimum: 0 },
          availabilityStatus: {
            type: "string",
            enum: ["AVAILABLE", "RESERVED", "SOLD", "UNAVAILABLE"]
          },
          saleStatus: { type: "string", example: "AVAILABLE" },
          moderationStatus: { type: "string", example: "approved" },
          isFavorite: { type: "boolean", nullable: true }
        }
      },
      ArtistSummary: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "integer" },
          displayName: { type: "string", nullable: true },
          verified: { type: "boolean" },
          bio: { type: "string", nullable: true },
          avatarUrl: { type: "string", nullable: true },
          coverUrl: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
          username: { type: "string", nullable: true },
          stats: {
            type: "object",
            additionalProperties: true,
            properties: {
              artworks: { type: "integer" },
              followers: { type: "integer" },
              collections: { type: "integer" }
            }
          }
        }
      },
      PublicMemberSummary: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "integer" },
          displayName: { type: "string", nullable: true },
          username: { type: "string", nullable: true },
          bio: { type: "string", nullable: true },
          avatarUrl: { type: "string", nullable: true },
          coverUrl: { type: "string", nullable: true },
          isArtist: { type: "boolean" },
          artistId: { type: "integer", nullable: true },
          verifiedArtist: { type: "boolean" },
          stats: {
            oneOf: [
              {
                type: "object",
                additionalProperties: true,
                properties: {
                  artworks: { type: "integer" },
                  followers: { type: "integer" },
                  collections: { type: "integer" }
                }
              },
              { type: "null" }
            ]
          },
          joinedAt: { type: "string", format: "date-time", nullable: true },
          profileUrl: { type: "string", nullable: true }
        }
      },
      CategorySummary: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          imageUrl: { type: "string", nullable: true },
          artworksCount: { type: "integer" }
        }
      },
      CollectionSummary: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          isPrivate: { type: "boolean" }
        }
      },
      NotificationSummary: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "integer" },
          type: { type: "string", example: "sale" },
          title: { type: "string" },
          message: { type: "string" },
          payload: { type: "object", nullable: true, additionalProperties: true },
          read: { type: "boolean" },
          readAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time", nullable: true }
        }
      },
      CartSummary: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "integer" },
          version: { type: "integer" },
          pricingFingerprint: { type: "string" },
          payable: { type: "boolean" },
          subtotalAmount: { type: "integer" },
          totalAmount: { type: "integer" },
          currency: { type: "string", example: "EUR" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
              properties: {
                artworkId: { type: "integer" },
                title: { type: "string" },
                artistName: { type: "string", nullable: true },
                quantity: { type: "integer" },
                subtotalAmount: { type: "integer" }
              }
            }
          }
        }
      },
      OrderCheckoutRequest: {
        type: "object",
        required: ["cartVersion", "pricingFingerprint", "billingDetails"],
        properties: {
          cartVersion: { type: "integer", minimum: 1 },
          pricingFingerprint: {
            type: "string",
            pattern: "^[a-f0-9]{64}$"
          },
          billingDetails: {
            $ref: "#/components/schemas/BillingDetails"
          }
        }
      },
      OrderCheckoutResponse: {
        type: "object",
        required: ["order", "payment"],
        properties: {
          order: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              status: { type: "string" },
              amount: { type: "integer" },
              currency: { type: "string", example: "EUR" },
              billingDetails: genericObjectSchema
            }
          },
          payment: {
            type: "object",
            properties: {
              status: { type: "string" },
              requiresConfirmation: { type: "boolean" },
              clientSecret: { type: "string", nullable: true }
            }
          }
        }
      },
      LegacyCheckoutRequest: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: genericObjectSchema
          },
          paymentMethod: { type: "string", nullable: true },
          billingEmail: { type: "string", format: "email", nullable: true }
        },
        additionalProperties: true
      },
      ArtistApplicationPayload: {
        type: "object",
        properties: {
          displayName: { type: "string" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          bio: { type: "string" },
          artType: { type: "string" },
          styles: {
            type: "array",
            items: { type: "string" }
          },
          portfolioUrl: { type: "string", format: "uri", nullable: true },
          socialHandle: { type: "string", nullable: true },
          addressLine1: { type: "string" },
          addressLine2: { type: "string", nullable: true },
          city: { type: "string" },
          region: { type: "string", nullable: true },
          postalCode: { type: "string" },
          country: { type: "string" },
          taxId: { type: "string" },
          termsAccepted: { type: "boolean" },
          commissionAccepted: { type: "boolean" }
        },
        additionalProperties: false
      },
      ArtistApplicationDraftSaveRequest: {
        type: "object",
        required: ["currentStep", "payload"],
        properties: {
          currentStep: { type: "integer", minimum: 1, maximum: 4 },
          payload: {
            $ref: "#/components/schemas/ArtistApplicationPayload"
          }
        },
        additionalProperties: false
      },
      ArtistApplicationSubmitRequest: {
        allOf: [
          {
            $ref: "#/components/schemas/ArtistApplicationPayload"
          },
          {
            type: "object",
            required: ["signatureDataUrl", "contractAccepted"],
            properties: {
              signatureDataUrl: {
                type: "string",
                description: "Artist signature image as a data URL."
              },
              contractAccepted: { type: "boolean" }
            },
            additionalProperties: true
          }
        ]
      },
      ArtistApplicationDraft: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "integer" },
          status: { type: "string" },
          currentStep: { type: "integer" },
          payload: { type: "object", additionalProperties: true },
          completedAt: { type: "string", format: "date-time", nullable: true },
          submittedAt: { type: "string", format: "date-time", nullable: true },
          reviewedAt: { type: "string", format: "date-time", nullable: true },
          reviewNote: { type: "string", nullable: true },
          contractAcceptedAt: { type: "string", format: "date-time", nullable: true },
          contractSignedAt: { type: "string", format: "date-time", nullable: true },
          contractVersion: { type: "string", nullable: true },
          contractRenewalRequired: { type: "boolean" },
          hasContractPdf: { type: "boolean" },
          lastReminderSentAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time", nullable: true },
          updatedAt: { type: "string", format: "date-time", nullable: true }
        }
      },
      ArtistDashboardResponse: {
        type: "object",
        additionalProperties: true,
        properties: {
          stats: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: {
                  oneOf: [{ type: "string" }, { type: "number" }, { type: "integer" }]
                },
                description: { type: "string" }
              }
            }
          },
          performance: { type: "object", additionalProperties: true },
          finance: { type: "object", additionalProperties: true },
          withdrawals: { type: "object", additionalProperties: true },
          withdrawalSummary: { type: "object", additionalProperties: true },
          analytics: { type: "object", additionalProperties: true },
          notifications: { type: "object", additionalProperties: true },
          recentWithdrawals: {
            type: "array",
            items: {
              $ref: "#/components/schemas/ArtistWithdrawalSummary"
            }
          },
          recentSales: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true
            }
          }
        }
      },
      ArtistSalesResponse: {
        type: "object",
        additionalProperties: true,
        properties: {
          summary: { type: "object", additionalProperties: true },
          sales: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true
            }
          }
        }
      },
      ArtistWithdrawalSummary: {
        type: "object",
        additionalProperties: true,
        properties: {
          publicId: { type: "string", format: "uuid" },
          status: {
            type: "string",
            enum: ["REQUESTED", "APPROVED", "REJECTED", "PAID", "CANCELED"]
          },
          amount: { type: "integer", nullable: true },
          amountValue: { type: "number", nullable: true },
          amountLabel: { type: "string" },
          currency: { type: "string", example: "EUR" },
          note: { type: "string", nullable: true },
          adminNote: { type: "string", nullable: true },
          payoutReference: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time", nullable: true },
          reviewedAt: { type: "string", format: "date-time", nullable: true },
          paidAt: { type: "string", format: "date-time", nullable: true },
          artist: { type: "object", nullable: true, additionalProperties: true },
          requestedBy: { type: "object", nullable: true, additionalProperties: true },
          reviewedBy: { type: "object", nullable: true, additionalProperties: true }
        }
      },
      ArtistWithdrawalWorkspaceResponse: {
        type: "object",
        additionalProperties: true,
        properties: {
          finance: { type: "object", additionalProperties: true },
          summary: { type: "object", additionalProperties: true },
          requests: {
            type: "array",
            items: {
              $ref: "#/components/schemas/ArtistWithdrawalSummary"
            }
          }
        }
      },
      ArtistWithdrawalRequest: {
        type: "object",
        required: ["amount"],
        properties: {
          amount: {
            type: "string",
            example: "120.00"
          },
          note: {
            type: "string",
            nullable: true
          }
        },
        additionalProperties: false
      },
      ArtistProfileUpdateRequest: {
        type: "object",
        properties: {
          displayName: { type: "string" },
          bio: { type: "string" },
          removeAvatar: { type: "boolean" },
          image: {
            type: "string",
            format: "binary"
          }
        },
        additionalProperties: false
      },
      ArtistCoverUpdateRequest: {
        type: "object",
        properties: {
          removeCover: { type: "boolean" },
          image: {
            type: "string",
            format: "binary"
          }
        },
        additionalProperties: false
      },
      ArtworkUpsertRequest: {
        type: "object",
        required: ["title", "categoryId", "price", "licenseType"],
        properties: {
          title: { type: "string" },
          description: {
            type: "string",
            description:
              "Required for COMMERCIAL licences and must specify the commercial usage terms."
          },
          categoryId: { type: "integer", minimum: 1 },
          price: { type: "string" },
          licenseType: {
            type: "string",
            enum: ["PERSONAL", "COMMERCIAL", "EXCLUSIVE"]
          },
          protection: { type: "boolean" }
        },
        additionalProperties: false
      },
      CollectionUpsertRequest: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
          description: { type: "string", nullable: true },
          isPrivate: { type: "boolean" }
        },
        additionalProperties: false
      },
      CollectionArtworkMutationRequest: {
        type: "object",
        required: ["artworkId"],
        properties: {
          artworkId: { type: "integer", minimum: 1 }
        },
        additionalProperties: false
      },
      AdminUserStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["active", "suspended", "blocked"]
          }
        },
        additionalProperties: false
      },
      AdminUserAdminAccessRequest: {
        type: "object",
        required: ["action"],
        properties: {
          action: {
            type: "string",
            enum: ["remove_admin", "remove_super_admin"]
          }
        },
        additionalProperties: false
      },
      AdminArtistVerificationRequest: {
        type: "object",
        required: ["verified"],
        properties: {
          verified: {
            type: "boolean"
          }
        },
        additionalProperties: false
      },
      AdminCategoryImageUpdateRequest: {
        type: "object",
        properties: {
          removeImage: { type: "boolean" },
          image: {
            type: "string",
            format: "binary"
          }
        },
        additionalProperties: false
      },
      AdminArtistApplicationReviewRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["approved", "rejected"]
          },
          reviewNote: {
            type: "string",
            nullable: true
          }
        },
        additionalProperties: false
      },
      AdminArtworkModerationRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["pending", "approved", "rejected", "hidden"]
          },
          moderationNote: {
            type: "string",
            nullable: true
          }
        },
        additionalProperties: false
      },
      AdminArtistWithdrawalActionRequest: {
        type: "object",
        required: ["action"],
        properties: {
          action: {
            type: "string",
            enum: ["approve", "reject", "mark_paid"]
          },
          adminNote: {
            type: "string",
            nullable: true
          },
          payoutReference: {
            type: "string",
            nullable: true
          }
        },
        additionalProperties: false
      },
      RefundRequest: {
        type: "object",
        properties: {
          amount: {
            type: "integer",
            description: "Refund amount in minor currency units."
          },
          reason: {
            type: "string",
            example: "requested_by_customer"
          }
        },
        additionalProperties: false
      },
      ResolveAlertRequest: {
        type: "object",
        properties: {
          resolutionCode: {
            type: "string",
            example: "MANUAL_REVIEW_COMPLETED"
          }
        },
        additionalProperties: false
      }
    }
  },
  paths: {
    ...platformPaths,
    ...authenticationPaths,
    ...marketplacePaths,
    ...collectorPaths,
    ...artistWorkspacePaths,
    ...checkoutPaths,
    ...notificationPaths,
    ...adminPaths,
    ...adminAnalyticsPaths,
    ...paymentOperationsPaths,
    ...webhookPaths
  }
};

function buildOpenApiSpec() {
  return openApiSpec;
}

module.exports = {
  buildOpenApiSpec
};
