package app

import (
	"database/sql"
	"fmt"
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
	"bw-ai-check/backend/pkg/crypto"
)

type legacyUserCredential struct {
	ID       string         `gorm:"column:id"`
	Password sql.NullString `gorm:"column:password"`
}

// PrepareDatabase 执行启动期的最小化数据库兼容修复。
func PrepareDatabase(db *gorm.DB, logger *zap.Logger) error {
	if err := ensureUserColumns(db, logger); err != nil {
		return err
	}

	if err := syncLegacyUserCredentials(db, logger); err != nil {
		return err
	}

	return nil
}

func ensureUserColumns(db *gorm.DB, logger *zap.Logger) error {
	columns := []struct {
		fieldName  string
		columnName string
	}{
		{fieldName: "PasswordHash", columnName: "password_hash"},
		{fieldName: "Grade", columnName: "grade"},
		{fieldName: "ClassName", columnName: "class_name"},
		{fieldName: "ClassID", columnName: "class_id"},
	}

	for _, column := range columns {
		if db.Migrator().HasColumn(&model.User{}, column.fieldName) {
			continue
		}

		if err := db.Migrator().AddColumn(&model.User{}, column.fieldName); err != nil {
			return fmt.Errorf("failed to add users.%s: %w", column.columnName, err)
		}

		logger.Info("Added missing users column", zap.String("column", column.columnName))
	}

	return nil
}

func syncLegacyUserCredentials(db *gorm.DB, logger *zap.Logger) error {
	if !db.Migrator().HasTable("users_copy1") {
		logger.Info("Legacy user table not found, skipping auth data sync")
		return nil
	}

	if db.Migrator().HasColumn("users_copy1", "login_id") {
		if err := backfillLoginIDsFromLegacy(db, logger); err != nil {
			return err
		}
	} else {
		logger.Info("Legacy users_copy1.login_id column not found, skipping login_id sync")
	}

	if err := backfillLoginIDsFromEmail(db, logger); err != nil {
		return err
	}

	if db.Migrator().HasColumn("users_copy1", "password") {
		if err := backfillPasswordHashes(db, logger); err != nil {
			return err
		}
	} else {
		logger.Info("Legacy users_copy1.password column not found, skipping password hash sync")
	}

	return nil
}

func backfillLoginIDsFromLegacy(db *gorm.DB, logger *zap.Logger) error {
	result := db.Exec(`
		UPDATE users AS u
		INNER JOIN users_copy1 AS legacy ON legacy.id = u.id
		SET u.login_id = legacy.login_id
		WHERE (u.login_id IS NULL OR TRIM(u.login_id) = '')
		  AND legacy.login_id IS NOT NULL
		  AND TRIM(legacy.login_id) <> ''
	`)
	if result.Error != nil {
		return fmt.Errorf("failed to sync login_id from users_copy1: %w", result.Error)
	}

	logger.Info("Backfilled users.login_id from legacy table", zap.Int64("rows", result.RowsAffected))
	return nil
}

func backfillLoginIDsFromEmail(db *gorm.DB, logger *zap.Logger) error {
	result := db.Exec(`
		UPDATE users
		SET login_id = email
		WHERE (login_id IS NULL OR TRIM(login_id) = '')
		  AND email IS NOT NULL
		  AND TRIM(email) <> ''
	`)
	if result.Error != nil {
		return fmt.Errorf("failed to backfill login_id from email: %w", result.Error)
	}

	logger.Info("Backfilled users.login_id from email", zap.Int64("rows", result.RowsAffected))
	return nil
}

func backfillPasswordHashes(db *gorm.DB, logger *zap.Logger) error {
	var credentials []legacyUserCredential
	if err := db.Raw(`
		SELECT u.id, legacy.password
		FROM users AS u
		INNER JOIN users_copy1 AS legacy ON legacy.id = u.id
		WHERE (u.password_hash IS NULL OR TRIM(u.password_hash) = '')
		  AND legacy.password IS NOT NULL
		  AND TRIM(legacy.password) <> ''
	`).Scan(&credentials).Error; err != nil {
		return fmt.Errorf("failed to load legacy passwords: %w", err)
	}

	updated := 0
	for _, credential := range credentials {
		password := strings.TrimSpace(credential.Password.String)
		if password == "" {
			continue
		}

		hash, err := crypto.HashPassword(password)
		if err != nil {
			return fmt.Errorf("failed to hash legacy password for user %s: %w", credential.ID, err)
		}

		if err := db.Model(&model.User{}).
			Where("id = ?", credential.ID).
			Update("password_hash", hash).Error; err != nil {
			return fmt.Errorf("failed to update password_hash for user %s: %w", credential.ID, err)
		}

		updated++
	}

	logger.Info("Backfilled users.password_hash from legacy table", zap.Int("rows", updated))
	return nil
}
