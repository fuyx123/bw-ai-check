package service

import (
	"fmt"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
)

// AccessContext 当前请求的访问上下文
type AccessContext struct {
	UserID       string
	RoleID       string
	DepartmentID string
	DataScope    string
}

func normalizePage(page, pageSize int) (int, int) {
	if page <= 0 {
		page = 1
	}
	switch {
	case pageSize <= 0:
		pageSize = 10
	case pageSize > 100:
		pageSize = 100
	}
	return page, pageSize
}

func newID(prefix string) string {
	id := strings.ReplaceAll(uuid.NewString(), "-", "")
	if len(id) > 12 {
		id = id[:12]
	}
	return fmt.Sprintf("%s-%s", prefix, id)
}

func buildInitials(name string) *string {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil
	}
	runes := []rune(name)
	switch {
	case len(runes) >= 2:
		initials := string(runes[:2])
		return &initials
	default:
		initials := string(runes[0])
		return &initials
	}
}

func applyDepartmentRuntimeFields(dept *model.Department) {
	if dept == nil {
		return
	}
	dept.Leader = model.DepartmentLeader{
		Name:   dept.LeaderName,
		Title:  dept.LeaderTitle,
		Avatar: dept.LeaderAvatar,
	}
}

func buildDepartmentTree(depts []model.Department) []model.Department {
	nodes := make(map[string]model.Department, len(depts))
	childrenByParent := make(map[string][]string)
	rootIDs := make([]string, 0)

	for _, dept := range depts {
		item := dept
		item.Children = nil
		applyDepartmentRuntimeFields(&item)
		nodes[item.ID] = item

		if item.ParentID != nil {
			childrenByParent[*item.ParentID] = append(childrenByParent[*item.ParentID], item.ID)
			continue
		}

		rootIDs = append(rootIDs, item.ID)
	}

	var assemble func(string) model.Department
	assemble = func(id string) model.Department {
		node := nodes[id]
		childIDs := childrenByParent[id]
		if len(childIDs) == 0 {
			return node
		}

		node.Children = make([]model.Department, 0, len(childIDs))
		for _, childID := range childIDs {
			_, ok := nodes[childID]
			if !ok {
				continue
			}
			node.Children = append(node.Children, assemble(childID))
		}
		sortDepartmentTree(node.Children)
		return node
	}

	roots := make([]model.Department, 0, len(rootIDs))
	for _, rootID := range rootIDs {
		if _, ok := nodes[rootID]; !ok {
			continue
		}
		roots = append(roots, assemble(rootID))
	}

	sortDepartmentTree(roots)
	return roots
}

func sortDepartmentTree(nodes []model.Department) {
	slices.SortFunc(nodes, func(a, b model.Department) int {
		if a.Name == b.Name {
			return strings.Compare(a.Code, b.Code)
		}
		return strings.Compare(a.Name, b.Name)
	})
	for idx := range nodes {
		if len(nodes[idx].Children) > 0 {
			sortDepartmentTree(nodes[idx].Children)
		}
	}
}

func collectDepartmentSubtreeIDs(rootID string, depts []model.Department) map[string]struct{} {
	if rootID == "" {
		return nil
	}

	childrenByParent := make(map[string][]string)
	for _, dept := range depts {
		if dept.ParentID != nil {
			childrenByParent[*dept.ParentID] = append(childrenByParent[*dept.ParentID], dept.ID)
		}
	}

	result := map[string]struct{}{rootID: {}}
	queue := []string{rootID}
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		for _, childID := range childrenByParent[current] {
			if _, exists := result[childID]; exists {
				continue
			}
			result[childID] = struct{}{}
			queue = append(queue, childID)
		}
	}
	return result
}

func collectDepartmentDeleteOrder(rootID string, depts []model.Department) []string {
	childrenByParent := make(map[string][]string)
	for _, dept := range depts {
		if dept.ParentID != nil {
			childrenByParent[*dept.ParentID] = append(childrenByParent[*dept.ParentID], dept.ID)
		}
	}

	result := make([]string, 0)
	var walk func(string)
	walk = func(nodeID string) {
		for _, childID := range childrenByParent[nodeID] {
			walk(childID)
		}
		result = append(result, nodeID)
	}
	walk(rootID)
	return result
}

func idsFromSet(set map[string]struct{}) []string {
	if len(set) == 0 {
		return nil
	}
	ids := make([]string, 0, len(set))
	for id := range set {
		ids = append(ids, id)
	}
	slices.Sort(ids)
	return ids
}

func resolveAccessibleDepartmentIDs(db *gorm.DB, access AccessContext) (map[string]struct{}, error) {
	if access.DepartmentID == "" || access.DataScope == "" || access.DataScope == "school" {
		return nil, nil
	}

	var depts []model.Department
	if err := db.Find(&depts).Error; err != nil {
		return nil, err
	}
	return collectDepartmentSubtreeIDs(access.DepartmentID, depts), nil
}

func departmentAccessible(accessible map[string]struct{}, departmentID string) bool {
	if accessible == nil {
		return true
	}
	_, ok := accessible[departmentID]
	return ok
}

func applyUserRuntimeFields(users []model.User) {
	for idx := range users {
		applyUserRuntimeField(&users[idx])
	}
}

func applyUserRuntimeField(user *model.User) {
	if user == nil {
		return
	}
	roleIDs := make([]string, 0, len(user.Roles))
	for _, role := range user.Roles {
		roleIDs = append(roleIDs, role.ID)
	}
	user.RoleIds = roleIDs
	if len(user.Roles) > 0 {
		user.RoleName = user.Roles[0].Name
	} else if user.UserType == "student" {
		user.RoleName = "学生"
	}
}

func containsKeyword(fields []string, keyword string) bool {
	keyword = strings.TrimSpace(strings.ToLower(keyword))
	if keyword == "" {
		return true
	}
	for _, field := range fields {
		if strings.Contains(strings.ToLower(field), keyword) {
			return true
		}
	}
	return false
}

func truncateText(value string, limit int) string {
	if limit <= 0 || utf8.RuneCountInString(value) <= limit {
		return value
	}
	runes := []rune(value)
	return string(runes[:limit]) + "..."
}
