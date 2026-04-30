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

	if err := ensureRoleColumns(db, logger); err != nil {
		return err
	}

	if err := ensureAnswerFilesTable(db, logger); err != nil {
		return err
	}

	if err := ensureCycleTables(db, logger); err != nil {
		return err
	}

	if err := ensureAIModelTable(db, logger); err != nil {
		return err
	}

	if err := ensureExamGraderTable(db, logger); err != nil {
		return err
	}

	if err := ensureHomeworkTables(db, logger); err != nil {
		return err
	}

	if err := syncLegacyUserCredentials(db, logger); err != nil {
		return err
	}

	return nil
}

// ensureCycleTables 创建/更新教学周期和考次相关表
func ensureCycleTables(db *gorm.DB, logger *zap.Logger) error {
	if err := db.AutoMigrate(&model.TeachingCycle{}, &model.ExamSession{}); err != nil {
		return fmt.Errorf("failed to migrate cycle tables: %w", err)
	}

	// 确保 answer_files 有 exam_session_id 列
	if !db.Migrator().HasColumn(&model.AnswerFile{}, "ExamSessionID") {
		if err := db.Migrator().AddColumn(&model.AnswerFile{}, "ExamSessionID"); err != nil {
			return fmt.Errorf("failed to add answer_files.exam_session_id: %w", err)
		}
		logger.Info("Added answer_files.exam_session_id column")
	}

	logger.Info("Cycle tables ready")
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

func ensureRoleColumns(db *gorm.DB, logger *zap.Logger) error {
	columns := []struct {
		fieldName  string
		columnName string
	}{
		{fieldName: "DataScope", columnName: "data_scope"},
	}

	for _, column := range columns {
		if db.Migrator().HasColumn(&model.Role{}, column.fieldName) {
			continue
		}

		if err := db.Migrator().AddColumn(&model.Role{}, column.fieldName); err != nil {
			return fmt.Errorf("failed to add roles.%s: %w", column.columnName, err)
		}

		logger.Info("Added missing roles column", zap.String("column", column.columnName))
	}

	return nil
}

func ensureAnswerFilesTable(db *gorm.DB, logger *zap.Logger) error {
	// 旧库可能将短字段建成 TEXT 且带索引，AutoMigrate 会触发 MySQL Error 1170
	if err := fixAnswerFilesMySQLTextColumnsBeforeMigrate(db, logger); err != nil {
		return err
	}
	if err := db.AutoMigrate(&model.AnswerFile{}); err != nil {
		return fmt.Errorf("failed to migrate answer_files table: %w", err)
	}
	logger.Info("answer_files table ready")
	return nil
}

// fixAnswerFilesMySQLTextColumnsBeforeMigrate 将 answer_files 上曾被误建为 TEXT/BLOB 的短字段改为 VARCHAR，并先删除这些列上的二级索引。
func fixAnswerFilesMySQLTextColumnsBeforeMigrate(db *gorm.DB, logger *zap.Logger) error {
	if db.Dialector.Name() != "mysql" {
		return nil
	}
	if !db.Migrator().HasTable("answer_files") {
		return nil
	}

	type colRow struct {
		Name string `gorm:"column:COLUMN_NAME"`
		Type string `gorm:"column:DATA_TYPE"`
	}
	var cols []colRow
	if err := db.Raw(`
		SELECT COLUMN_NAME, DATA_TYPE
		FROM information_schema.COLUMNS
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'answer_files'
	`).Scan(&cols).Error; err != nil {
		return fmt.Errorf("inspect answer_files columns: %w", err)
	}

	textLike := map[string]bool{
		"text": true, "tinytext": true, "mediumtext": true, "longtext": true,
		"blob": true, "tinyblob": true, "mediumblob": true, "longblob": true,
	}
	needFix := make(map[string]bool)
	for _, c := range cols {
		if textLike[strings.ToLower(c.Type)] {
			needFix[c.Name] = true
		}
	}

	fixes := []struct {
		col   string
		alter string
	}{
		{"uploader_id", "MODIFY COLUMN uploader_id VARCHAR(64) NOT NULL"},
		{"exam_session_id", "MODIFY COLUMN exam_session_id VARCHAR(64) NULL"},
		{"class_id", "MODIFY COLUMN class_id VARCHAR(64) NULL"},
		{"batch_id", "MODIFY COLUMN batch_id VARCHAR(64) NULL"},
		{"grader_id", "MODIFY COLUMN grader_id VARCHAR(64) NULL"},
		{"id", "MODIFY COLUMN id VARCHAR(64) NOT NULL"},
		{"file_key", "MODIFY COLUMN file_key VARCHAR(1024) NOT NULL"},
		{"original_name", "MODIFY COLUMN original_name VARCHAR(512) NOT NULL"},
	}

	toDrop := make(map[string]bool)
	for _, f := range fixes {
		if !needFix[f.col] {
			continue
		}
		names, err := listMySQLSecondaryIndexNamesOnColumn(db, "answer_files", f.col)
		if err != nil {
			return err
		}
		for _, n := range names {
			toDrop[n] = true
		}
	}
	for idxName := range toDrop {
		q := fmt.Sprintf("ALTER TABLE `answer_files` DROP INDEX `%s`", idxName)
		if err := db.Exec(q).Error; err != nil {
			return fmt.Errorf("drop index %s: %w", idxName, err)
		}
		logger.Info("dropped secondary index before VARCHAR migration", zap.String("table", "answer_files"), zap.String("index", idxName))
	}

	for _, f := range fixes {
		if !needFix[f.col] {
			continue
		}
		stmt := "ALTER TABLE answer_files " + f.alter
		if err := db.Exec(stmt).Error; err != nil {
			return fmt.Errorf("answer_files fix column %s: %w", f.col, err)
		}
		logger.Info("answer_files column converted from TEXT/BLOB to VARCHAR", zap.String("column", f.col))
	}
	return nil
}

func listMySQLSecondaryIndexNamesOnColumn(db *gorm.DB, table, column string) ([]string, error) {
	type idxRow struct {
		IndexName string `gorm:"column:INDEX_NAME"`
	}
	var rows []idxRow
	if err := db.Raw(`
		SELECT DISTINCT INDEX_NAME
		FROM information_schema.STATISTICS
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND INDEX_NAME <> 'PRIMARY'
	`, table, column).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("list indexes on %s.%s: %w", table, column, err)
	}
	out := make([]string, 0, len(rows))
	for _, r := range rows {
		if r.IndexName != "" {
			out = append(out, r.IndexName)
		}
	}
	return out, nil
}

// ensureAIModelTable 创建 ai_models 表并插入菜单/权限（幂等）
func ensureAIModelTable(db *gorm.DB, logger *zap.Logger) error {
	if err := db.AutoMigrate(&model.AIModel{}); err != nil {
		return fmt.Errorf("failed to migrate ai_models: %w", err)
	}

	// 插入菜单（幂等：id 重复时忽略）
	db.Exec(`
		INSERT IGNORE INTO menus (id, parent_id, name, path, icon, sort_order, visible, type, created_at, updated_at)
		VALUES ('menu-model', NULL, '模型管理', '/models', 'ApiOutlined', 10, 1, 'menu', NOW(), NOW())
	`)

	logger.Info("AI model table and menu ready")
	return nil
}

// ensureExamGraderTable 创建 exam_graders 表（幂等）
func ensureExamGraderTable(db *gorm.DB, logger *zap.Logger) error {
	if err := db.AutoMigrate(&model.ExamGrader{}); err != nil {
		return fmt.Errorf("failed to migrate exam_graders: %w", err)
	}
	logger.Info("exam_graders table ready")
	return nil
}

func ensureHomeworkTables(db *gorm.DB, logger *zap.Logger) error {
	if err := db.AutoMigrate(&model.HomeworkTask{}, &model.HomeworkTaskClass{}, &model.HomeworkSubmission{}); err != nil {
		return fmt.Errorf("failed to migrate homework tables: %w", err)
	}

	db.Exec(`
		INSERT IGNORE INTO menus (id, parent_id, name, path, icon, sort_order, visible, type, created_at, updated_at)
		VALUES
			('menu-homework-approval', NULL, '作业审批', '/homework', 'BookOutlined', 7, 1, 'menu', NOW(), NOW())
	`)

	rootRoles := []string{"role-president", "role-academic-director", "role-dean", "role-major-lead", "role-lecturer", "role-student"}
	for _, roleID := range rootRoles {
		db.Exec(`INSERT IGNORE INTO role_menus (role_id, menu_id) VALUES (?, 'menu-homework-approval')`, roleID)
	}

	logger.Info("homework tables and menus ready")
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
