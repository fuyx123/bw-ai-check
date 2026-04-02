package app

import (
	"fmt"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/config"
	"bw-ai-check/backend/internal/repository"
	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/storage"
	"bw-ai-check/backend/pkg/uploader"
)

// Container 依赖注入容器，包含所有应用级别的依赖
type Container struct {
	Config   *config.Config
	Logger   *zap.Logger
	DB       *gorm.DB
	Storage  storage.Storage
	Uploader *uploader.Uploader

	// Repositories
	UserRepo        *repository.UserRepository
	DeptRepo        *repository.DepartmentRepository
	RoleRepo        *repository.RoleRepository
	MenuRepo        *repository.MenuRepository
	PosRepo         *repository.PositionRepository
	GradeRepo       *repository.GradeRepository
	AuditLogRepo    *repository.AuditLogRepository
	AnswerFileRepo  *repository.AnswerFileRepository
	CycleRepo       *repository.TeachingCycleRepository
	SessionRepo     *repository.ExamSessionRepository
	AIModelRepo     *repository.AIModelRepository
	ExamGraderRepo  *repository.ExamGraderRepository

	// Services
	AuthSvc       *service.AuthService
	UserSvc       *service.UserService
	DeptSvc       *service.DepartmentService
	RoleSvc       *service.RoleService
	MenuSvc       *service.MenuService
	PosSvc        *service.PositionService
	GradeSvc      *service.GradeService
	AuditSvc      *service.AuditLogService
	ExamSvc       *service.ExamService
	CycleSvc      *service.CycleService
	ModelSvc      *service.AIModelService
	ExamGraderSvc *service.ExamGraderService
}

// NewContainer 创建并初始化依赖容器
func NewContainer(cfg *config.Config, logger *zap.Logger, db *gorm.DB) (*Container, error) {
	// 初始化 MinIO 存储
	storageCfg := cfg.Storage
	storageImpl, err := storage.NewMinIOStorage(
		storageCfg.Endpoint,
		storageCfg.AccessKey,
		storageCfg.SecretKey,
		storageCfg.Bucket,
		storageCfg.UseSSL,
		storageCfg.PublicURL,
		logger,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize storage: %w", err)
	}

	// 初始化上传器（统一封装单文件/字节流上传）
	uploaderImpl := uploader.New(storageImpl, storageCfg.MaxSizeMB, logger)

	container := &Container{
		Config:   cfg,
		Logger:   logger,
		DB:       db,
		Storage:  storageImpl,
		Uploader: uploaderImpl,
	}

	// 初始化仓储
	container.UserRepo = repository.NewUserRepository(db, logger)
	container.DeptRepo = repository.NewDepartmentRepository(db, logger)
	container.RoleRepo = repository.NewRoleRepository(db, logger)
	container.MenuRepo = repository.NewMenuRepository(db, logger)
	container.PosRepo = repository.NewPositionRepository(db, logger)
	container.GradeRepo = repository.NewGradeRepository(db, logger)
	container.AuditLogRepo = repository.NewAuditLogRepository(db, logger)
	container.AnswerFileRepo = repository.NewAnswerFileRepository(db, logger)
	container.CycleRepo = repository.NewTeachingCycleRepository(db)
	container.SessionRepo = repository.NewExamSessionRepository(db)
	container.AIModelRepo = repository.NewAIModelRepository(db)
	container.ExamGraderRepo = repository.NewExamGraderRepository(db)

	// 初始化服务
	container.AuthSvc = service.NewAuthService(db, container.UserRepo, logger)
	container.UserSvc = service.NewUserService(db, container.UserRepo, logger)
	container.DeptSvc = service.NewDepartmentService(db, container.DeptRepo, logger)
	container.RoleSvc = service.NewRoleService(db, container.RoleRepo, logger)
	container.MenuSvc = service.NewMenuService(db, container.MenuRepo, logger)
	container.PosSvc = service.NewPositionService(db, container.PosRepo, logger)
	container.GradeSvc = service.NewGradeService(db, container.GradeRepo, logger)
	container.AuditSvc = service.NewAuditLogService(db, container.AuditLogRepo, logger)
	container.ExamGraderSvc = service.NewExamGraderService(container.ExamGraderRepo, container.SessionRepo)
	container.ExamSvc = service.NewExamService(db, container.AnswerFileRepo, container.ExamGraderRepo, uploaderImpl, container.AIModelRepo, logger)
	container.CycleSvc = service.NewCycleService(db, container.CycleRepo, container.SessionRepo, logger)
	container.ModelSvc = service.NewAIModelService(container.AIModelRepo, logger)

	logger.Info("Container initialized",
		zap.String("storage.endpoint", storageCfg.Endpoint),
		zap.String("storage.bucket", storageCfg.Bucket),
		zap.Int64("storage.maxSizeMB", storageCfg.MaxSizeMB),
	)
	return container, nil
}
