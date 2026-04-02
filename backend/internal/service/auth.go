package service

import (
	"fmt"
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/dto"
	"bw-ai-check/backend/internal/model"
	"bw-ai-check/backend/internal/repository"
	"bw-ai-check/backend/pkg/crypto"
	jwtpkg "bw-ai-check/backend/pkg/jwt"
)

// AuthService 认证服务
type AuthService struct {
	db       *gorm.DB
	userRepo *repository.UserRepository
	logger   *zap.Logger
}

// NewAuthService 创建认证服务
func NewAuthService(db *gorm.DB, userRepo *repository.UserRepository, logger *zap.Logger) *AuthService {
	return &AuthService{
		db:       db,
		userRepo: userRepo,
		logger:   logger,
	}
}

// LoginResp 登录响应
type LoginResp struct {
	Token       string   `json:"token"`
	User        UserVO   `json:"user"`
	Permissions []string `json:"permissions"`
}

// UserVO 用户视图对象（用于响应）
type UserVO struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Email          string   `json:"email"`
	Avatar         *string  `json:"avatar,omitempty"`
	Initials       *string  `json:"initials,omitempty"`
	UserType       string   `json:"userType"`
	LoginID        string   `json:"loginId"`
	DepartmentID   string   `json:"departmentId"`
	DepartmentName string   `json:"departmentName"`
	RoleIds        []string `json:"roleIds"`
	RoleName       string   `json:"roleName"`
	AccessStatus   string   `json:"accessStatus"`
	IsActive       bool     `json:"isActive"`
	Grade          *string  `json:"grade,omitempty"`
	ClassName      *string  `json:"className,omitempty"`
	ClassID        *string  `json:"classId,omitempty"`
	DataScope      string   `json:"dataScope"`
}

// Login 用户登录
func (s *AuthService) Login(req dto.LoginReq) (*LoginResp, error) {
	// 1. 查询用户（通过 repository）
	user, err := s.userRepo.FindByLoginID(req.LoginID, req.UserType)
	if err != nil {
		s.logger.Warn("User not found or query error",
			zap.String("loginID", req.LoginID),
			zap.String("userType", req.UserType),
			zap.Error(err))
		return nil, fmt.Errorf("invalid login credentials")
	}

	// 2. 验证密码（使用加盐验证）
	if err := crypto.VerifyPassword(user.PasswordHash, req.Password); err != nil {
		s.logger.Warn("Password verification failed",
			zap.String("userID", user.ID),
			zap.String("loginID", resolveLoginIdentifier(user)))
		return nil, fmt.Errorf("invalid login credentials")
	}

	// 3. 检查账户是否激活
	if !user.IsActive {
		s.logger.Warn("Account is not active",
			zap.String("userID", user.ID),
			zap.String("loginID", resolveLoginIdentifier(user)))
		return nil, fmt.Errorf("account is not active")
	}

	// 4. 获取部门信息
	dept := &model.Department{}
	s.db.Where("id = ?", user.DepartmentID).First(dept)

	// 5. 确定 DataScope 和主角色ID
	// 说明：claims 里仍保留单个 RoleID 字段（用于兼容现有结构），
	// 但权限/菜单校验已改为支持多角色，所以这里将 RoleID 取为“主角色”（roles[0]）。
	var roleID string
	var dataScope string
	var roleIDs []string
	if len(user.Roles) > 0 {
		roleIDs = make([]string, 0, len(user.Roles))
		for _, r := range user.Roles {
			roleIDs = append(roleIDs, r.ID)
		}

		roleID = user.Roles[0].ID
		dataScope = maxDataScopeFromRoles(user.Roles)
	} else {
		// 学生默认为 class scope
		if req.UserType == "student" {
			dataScope = "class"
		} else {
			dataScope = "school"
		}
		roleID = "role-default"
	}

	// 6. 获取用户权限（菜单 ID）
	permissions, err := s.getUserPermissions(roleIDs)
	if err != nil {
		s.logger.Warn("Failed to get user permissions",
			zap.Strings("roleIDs", roleIDs),
			zap.Error(err))
		return nil, fmt.Errorf("failed to get permissions: %w", err)
	}

	// 7. 生成 JWT Token
	claims := jwtpkg.Claims{
		UserID:       user.ID,
		LoginID:      resolveLoginIdentifier(user),
		UserType:     user.UserType,
		DataScope:    dataScope,
		RoleID:       roleID,
		DepartmentID: user.DepartmentID,
	}
	token, err := jwtpkg.GenerateToken(claims)
	if err != nil {
		s.logger.Error("Failed to generate token",
			zap.String("userID", user.ID),
			zap.Error(err))
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// 8. 构建响应
	userVO := s.modelToVO(user, dept)
	userVO.DataScope = dataScope

	s.logger.Info("User login successful",
		zap.String("userID", user.ID),
		zap.String("loginID", resolveLoginIdentifier(user)),
		zap.String("userType", user.UserType))

	return &LoginResp{
		Token:       token,
		User:        userVO,
		Permissions: permissions,
	}, nil
}

// GetMe 获取当前用户信息
func (s *AuthService) GetMe(userID string) (*UserVO, error) {
	// 通过 repository 查询用户
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		s.logger.Warn("User not found",
			zap.String("userID", userID),
			zap.Error(err))
		return nil, fmt.Errorf("user not found")
	}

	// 获取部门信息
	dept := &model.Department{}
	s.db.Where("id = ?", user.DepartmentID).First(dept)

	// 确定 DataScope：取用户所有角色的数据范围中的“最宽松”范围。
	// （roles[0] 仍被用于 RoleName 等展示字段，但数据范围以多角色聚合结果为准）
	dataScope := "school"
	if len(user.Roles) > 0 {
		dataScope = maxDataScopeFromRoles(user.Roles)
	} else if user.UserType == "student" {
		dataScope = "class"
	}

	userVO := s.modelToVO(user, dept)
	userVO.DataScope = dataScope

	s.logger.Info("User info retrieved",
		zap.String("userID", userID))

	return &userVO, nil
}

// GetUserPermissions 获取用户权限列表
func (s *AuthService) getUserPermissions(roleIDs []string) ([]string, error) {
	if len(roleIDs) == 0 {
		return []string{}, nil
	}

	var menuIDs []string
	err := s.db.Table("role_menus").
		Where("role_id IN ?", roleIDs).
		Pluck("menu_id", &menuIDs).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get role menus: %w", err)
	}
	return menuIDs, nil
}

// maxDataScopeFromRoles 取多角色中的“最宽松”数据范围。
// 范围层级（从宽到严）：school > college > major > class
func maxDataScopeFromRoles(roles []model.Role) string {
	priority := map[string]int{
		"school":  4,
		"college": 3,
		"major":   2,
		"class":   1,
	}

	maxScore := 0
	result := "class"
	for _, r := range roles {
		score, ok := priority[r.DataScope]
		if !ok {
			continue
		}
		if score > maxScore {
			maxScore = score
			result = r.DataScope
		}
	}

	if maxScore == 0 {
		return "class"
	}
	return result
}

// modelToVO 将 User 模型转换为 VO
func (s *AuthService) modelToVO(user *model.User, dept *model.Department) UserVO {
	vo := UserVO{
		ID:             user.ID,
		Name:           user.Name,
		Email:          user.Email,
		Avatar:         user.Avatar,
		Initials:       user.Initials,
		UserType:       user.UserType,
		LoginID:        resolveLoginIdentifier(user),
		DepartmentID:   user.DepartmentID,
		DepartmentName: dept.Name,
		AccessStatus:   user.AccessStatus,
		IsActive:       user.IsActive,
		Grade:          user.Grade,
		ClassName:      user.ClassName,
		ClassID:        user.ClassID,
	}

	// 提取角色信息
	if len(user.Roles) > 0 {
		vo.RoleIds = make([]string, len(user.Roles))
		for i, role := range user.Roles {
			vo.RoleIds[i] = role.ID
		}
		vo.RoleName = user.Roles[0].Name
	}

	return vo
}

func resolveLoginIdentifier(user *model.User) string {
	if user == nil {
		return ""
	}

	if loginID := strings.TrimSpace(user.LoginID); loginID != "" {
		return loginID
	}

	return strings.TrimSpace(user.Email)
}
