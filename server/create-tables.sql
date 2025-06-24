-- Create Conversations table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Conversations')
BEGIN
    CREATE TABLE Conversations (
        ConversationId UNIQUEIDENTIFIER PRIMARY KEY,
        UserId NVARCHAR(255) NOT NULL,
        UserEmail NVARCHAR(255),
        ChatType NVARCHAR(50) NOT NULL,
        LastUpdated DATETIME2 NOT NULL,
        StartTime DATETIME2 NOT NULL,
        MessageCount INT NOT NULL DEFAULT 0,
        TotalTokens INT NOT NULL DEFAULT 0,
        ConversationState NVARCHAR(MAX) NOT NULL,
        LastUserMessage NVARCHAR(MAX),
        LastAssistantMessage NVARCHAR(MAX),
        Metadata NVARCHAR(MAX) NULL
    );

    -- Create indexes for better performance
    CREATE INDEX IX_Conversations_UserId ON Conversations(UserId);
    CREATE INDEX IX_Conversations_ChatType ON Conversations(ChatType);
    CREATE INDEX IX_Conversations_LastUpdated ON Conversations(LastUpdated);
END
