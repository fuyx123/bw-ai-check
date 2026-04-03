package redisNux

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"time"
)

// 全局 Redis 客户端（初始化一次）
var ctx = context.Background()

// ====================== 分布式锁封装成结构体类 ======================

// RedisLock 分布式锁类
type RedisLock struct {
	client *redis.Client // Redis 客户端
	key    string        // 锁 key
	token  string        // 锁唯一标识（UUID）
	expire time.Duration // 锁过期时间
}

// NewRedisLock 创建一个分布式锁实例（推荐用法）
func NewRedisLock(client *redis.Client, key string, expire time.Duration) *RedisLock {
	return &RedisLock{
		client: client,
		key:    key,
		token:  uuid.NewString(), // 自动生成唯一token，无需外部传入
		expire: expire,
	}
}

// TryLock 尝试获取锁（原子操作）
func (l *RedisLock) TryLock() (bool, error) {
	if l.client == nil || l.key == "" {
		return false, fmt.Errorf("lock client or key is empty")
	}
	return l.client.SetNX(ctx, l.key, l.token, l.expire).Result()
}

// UnLock 释放锁（Lua 原子脚本，只能释放自己的锁）
func (l *RedisLock) UnLock() error {
	script := `
		if redisNux.call("get", KEYS[1]) == ARGV[1] then
			return redisNux.call("del", KEYS[1])
		else
			return 0
		end
	`
	cmd := l.client.Eval(ctx, script, []string{l.key}, l.token)
	_, err := cmd.Result()
	return err
}

// MustLock 阻塞式获取锁（直到获取成功，可选）
func (l *RedisLock) MustLock(retryInterval time.Duration) error {
	for {
		ok, err := l.TryLock()
		if err != nil {
			return err
		}
		if ok {
			return nil
		}
		// 等待后重试
		time.Sleep(retryInterval)
	}
}
