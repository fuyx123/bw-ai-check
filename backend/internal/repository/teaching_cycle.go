package repository

import (
	"bw-ai-check/backend/internal/model"

	"gorm.io/gorm"
)

// TeachingCycleRepository 教学周期数据访问
type TeachingCycleRepository struct {
	db *gorm.DB
}

func NewTeachingCycleRepository(db *gorm.DB) *TeachingCycleRepository {
	return &TeachingCycleRepository{db: db}
}

func (r *TeachingCycleRepository) Create(c *model.TeachingCycle) error {
	return r.db.Create(c).Error
}

func (r *TeachingCycleRepository) FindByID(id string) (*model.TeachingCycle, error) {
	var c model.TeachingCycle
	if err := r.db.First(&c, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *TeachingCycleRepository) List() ([]*model.TeachingCycle, error) {
	var cycles []*model.TeachingCycle
	if err := r.db.Order("start_date DESC").Find(&cycles).Error; err != nil {
		return nil, err
	}
	return cycles, nil
}

func (r *TeachingCycleRepository) Update(c *model.TeachingCycle) error {
	return r.db.Save(c).Error
}

func (r *TeachingCycleRepository) Delete(id string) error {
	return r.db.Delete(&model.TeachingCycle{}, "id = ?", id).Error
}
