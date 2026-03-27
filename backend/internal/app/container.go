package app

import (
	"fmt"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/config"
	"bw-ai-check/backend/internal/repository"
	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/storage"
)

// Container 依赖注入容器，包含所有应用级别的依赖
type Container struct {
	Config  *config.Config
	Logger  *zap.Logger
	DB      *gorm.DB
	Storage storage.Storage

	// Repositories
	UserRepo      *repository.UserRepository
	DeptRepo      *repository.DepartmentRepository
	RoleRepo      *repository.RoleRepository
	MenuRepo      *repository.MenuRepository
	PosRepo       *repository.PositionRepository
	GradeRepo     *repository.GradeRepository
	AuditLogRepo  *repository.AuditLogRepository

	// Services
	AuthSvc  *service.AuthService
	UserSvc  *service.UserService
	DeptSvc  *service.DepartmentService
	RoleSvc  *service.RoleService
	MenuSvc  *service.MenuService
	PosSvc   *service.PositionService
	GradeSvc *service.GradeService
	AuditSvc *service.AuditLogService
}

// NewContainer 创建并初始化依赖容器
func NewContainer(cfg *config.Config, logger *zap.Logger, db *gorm.DB) (*Container, error) {
	// 初始化存储
	storageImpl, err := storage.NewMinIOStorage(
		cfg.Storage.Endpoint,
		cfg.Storage.AccessKey,
		cfg.Storage.SecretKey,
		cfg.Storage.Bucket,
		cfg.Storage.UseSSL,
		logger,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize storage: %w", err)
	}

	container := &Container{
		Config:  cfg,
		Logger:  logger,
		DB:      db,
		Storage: storageImpl,
	}

	// 初始化所有仓储
	container.UserRepo = repository.NewUserRepository(db, logger)
	container.DeptRepo = repository.NewDepartmentRepository(db, logger)
	container.RoleRepo = repository.NewRoleRepository(db, logger)
	container.MenuRepo = repository.NewMenuRepository(db, logger)
	container.PosRepo = repository.NewPositionRepository(db, logger)
	container.GradeRepo = repository.NewGradeRepository(db, logger)
	container.AuditLogRepo = repository.NewAuditLogRepository(db, logger)

	// 初始化所有服务（注入仓储和日志）
	container.AuthSvc = service.NewAuthService(db, container.UserRepo, logger)
	container.UserSvc = service.NewUserService(db, container.UserRepo, logger)
	container.DeptSvc = service.NewDepartmentService(db, container.DeptRepo, logger)
	container.RoleSvc = service.NewRoleService(db, container.RoleRepo, logger)
	container.MenuSvc = service.NewMenuService(db, container.MenuRepo, logger)
	container.PosSvc = service.NewPositionService(db, container.PosRepo, logger)
	container.GradeSvc = service.NewGradeService(db, container.GradeRepo, logger)
	container.AuditSvc = service.NewAuditLogService(db, container.AuditLogRepo, logger)

	logger.Info("Container initialized successfully")
	return container, nil
}
