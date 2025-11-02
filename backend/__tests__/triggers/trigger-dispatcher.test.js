/**
 * @file trigger-dispatcher.test.js
 * @description Tests para el dispatcher de triggers de notificaciones
 * @module __tests__/triggers/trigger-dispatcher
 *
 * Agente: Vanguard (Testing) + Nexus (Backend)
 * Cobertura objetivo: 100%
 */

const triggerDispatcher = require('../../triggers/trigger-dispatcher');
const orderNotifications = require('../../triggers/order-notifications');
const driverNotifications = require('../../triggers/driver-notifications');
const adminNotifications = require('../../triggers/admin-notifications');

// Mocks
jest.mock('../../triggers/order-notifications');
jest.mock('../../triggers/driver-notifications');
jest.mock('../../triggers/admin-notifications');

describe('TriggerDispatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('dispatch()', () => {
    describe('Order Events', () => {
      it('should dispatch order.created event to orderNotifications', async () => {
        orderNotifications.handleEvent.mockResolvedValue({ success: true, notificationsSent: 2 });

        const result = await triggerDispatcher.dispatch('order.created', {
          orderId: 'test123',
          userId: 'user123',
          orderData: { total: 350 }
        });

        expect(result.success).toBe(true);
        expect(result.results.order).toEqual({ success: true, notificationsSent: 2 });
        expect(orderNotifications.handleEvent).toHaveBeenCalledWith(
          'order.created',
          { orderId: 'test123', userId: 'user123', orderData: { total: 350 } },
          {}
        );
      });

      it('should dispatch order.preparing event to orderNotifications', async () => {
        orderNotifications.handleEvent.mockResolvedValue({ success: true });

        const result = await triggerDispatcher.dispatch('order.preparing', {
          orderId: 'order456',
          userId: 'user456'
        });

        expect(result.success).toBe(true);
        expect(orderNotifications.handleEvent).toHaveBeenCalledWith(
          'order.preparing',
          { orderId: 'order456', userId: 'user456' },
          {}
        );
      });

      it('should dispatch order.cancelled event to orderNotifications', async () => {
        orderNotifications.handleEvent.mockResolvedValue({ success: true });

        const result = await triggerDispatcher.dispatch('order.cancelled', {
          orderId: 'order789',
          userId: 'user789'
        });

        expect(result.success).toBe(true);
        expect(orderNotifications.handleEvent).toHaveBeenCalled();
      });
    });

    describe('Driver Events', () => {
      it('should dispatch driver.order_assigned event to driverNotifications', async () => {
        driverNotifications.handleEvent.mockResolvedValue({ success: true, notificationsSent: 1 });

        const result = await triggerDispatcher.dispatch('driver.order_assigned', {
          orderId: 'order123',
          driverId: 'driver123'
        });

        expect(result.success).toBe(true);
        expect(result.results.driver).toEqual({ success: true, notificationsSent: 1 });
        expect(driverNotifications.handleEvent).toHaveBeenCalledWith(
          'driver.order_assigned',
          { orderId: 'order123', driverId: 'driver123' },
          {}
        );
      });

      it('should dispatch driver.order_ready event to driverNotifications', async () => {
        driverNotifications.handleEvent.mockResolvedValue({ success: true });

        const result = await triggerDispatcher.dispatch('driver.order_ready', {
          orderId: 'order456',
          driverId: 'driver456'
        });

        expect(result.success).toBe(true);
        expect(driverNotifications.handleEvent).toHaveBeenCalled();
      });
    });

    describe('Admin Events', () => {
      it('should dispatch admin.new_order event to adminNotifications', async () => {
        adminNotifications.handleEvent.mockResolvedValue({ success: true, notificationsSent: 3 });

        const result = await triggerDispatcher.dispatch('admin.new_order', {
          orderId: 'order123',
          orderData: { total: 500 }
        });

        expect(result.success).toBe(true);
        expect(result.results.admin).toEqual({ success: true, notificationsSent: 3 });
        expect(adminNotifications.handleEvent).toHaveBeenCalledWith(
          'admin.new_order',
          { orderId: 'order123', orderData: { total: 500 } },
          {}
        );
      });

      it('should dispatch admin.order_cancelled event to adminNotifications', async () => {
        adminNotifications.handleEvent.mockResolvedValue({ success: true });

        const result = await triggerDispatcher.dispatch('admin.order_cancelled', {
          orderId: 'order789'
        });

        expect(result.success).toBe(true);
        expect(adminNotifications.handleEvent).toHaveBeenCalled();
      });
    });

    describe('Validation', () => {
      it('should reject when eventType is missing', async () => {
        const result = await triggerDispatcher.dispatch(null, { orderId: '123' });

        expect(result.success).toBe(false);
        expect(result.error).toContain('eventType is required');
      });

      it('should reject when eventType is not a string', async () => {
        const result = await triggerDispatcher.dispatch(123, { orderId: '123' });

        expect(result.success).toBe(false);
        expect(result.error).toContain('must be a string');
      });

      it('should reject when eventType has invalid format', async () => {
        const result = await triggerDispatcher.dispatch('invalid', { orderId: '123' });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid event format');
      });

      it('should reject unknown event category', async () => {
        const result = await triggerDispatcher.dispatch('unknown.event', { orderId: '123' });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unknown event category: unknown');
      });
    });

    describe('Error Handling', () => {
      it('should handle errors gracefully (fire-and-forget)', async () => {
        orderNotifications.handleEvent.mockRejectedValue(new Error('FCM service down'));

        const result = await triggerDispatcher.dispatch('order.created', {
          orderId: 'test123',
          userId: 'user123'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('FCM service down');
      });

      it('should throw errors when skipErrorHandling is true', async () => {
        await expect(
          triggerDispatcher.dispatch(null, { orderId: '123' }, { skipErrorHandling: true })
        ).rejects.toThrow('eventType is required');
      });

      it('should throw errors from handlers when skipErrorHandling is true', async () => {
        orderNotifications.handleEvent.mockRejectedValue(new Error('Handler error'));

        await expect(
          triggerDispatcher.dispatch('order.created', { orderId: '123', userId: 'user123' }, { skipErrorHandling: true })
        ).rejects.toThrow('Handler error');
      });
    });

    describe('Options Passing', () => {
      it('should pass options to event handlers', async () => {
        orderNotifications.handleEvent.mockResolvedValue({ success: true });

        const options = { skipErrorHandling: true, customOption: 'test' };
        await triggerDispatcher.dispatch('order.created', {
          orderId: '123',
          userId: 'user123'
        }, options);

        expect(orderNotifications.handleEvent).toHaveBeenCalledWith(
          'order.created',
          { orderId: '123', userId: 'user123' },
          options
        );
      });
    });
  });

  describe('dispatchBatch()', () => {
    it('should dispatch multiple events successfully', async () => {
      orderNotifications.handleEvent.mockResolvedValue({ success: true });
      adminNotifications.handleEvent.mockResolvedValue({ success: true });

      const events = [
        { eventType: 'order.created', eventData: { orderId: '1', userId: 'user1' } },
        { eventType: 'admin.new_order', eventData: { orderId: '1' } }
      ];

      const result = await triggerDispatcher.dispatchBatch(events);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.failedCount).toBe(0);
      expect(orderNotifications.handleEvent).toHaveBeenCalled();
      expect(adminNotifications.handleEvent).toHaveBeenCalled();
    });

    it('should handle empty events array', async () => {
      const result = await triggerDispatcher.dispatchBatch([]);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
      expect(result.failedCount).toBe(0);
    });

    it('should handle invalid events array', async () => {
      const result = await triggerDispatcher.dispatchBatch(null);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
      expect(result.failedCount).toBe(0);
    });

    it('should track failed events in batch', async () => {
      orderNotifications.handleEvent.mockResolvedValueOnce({ success: true });
      orderNotifications.handleEvent.mockRejectedValueOnce(new Error('Failed'));

      const events = [
        { eventType: 'order.created', eventData: { orderId: '1', userId: 'user1' } },
        { eventType: 'order.created', eventData: { orderId: '2', userId: 'user2' } }
      ];

      const result = await triggerDispatcher.dispatchBatch(events);

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(2);
      expect(result.failedCount).toBe(1);
    });

    it('should pass options to all events in batch', async () => {
      orderNotifications.handleEvent.mockResolvedValue({ success: true });

      const events = [
        { eventType: 'order.created', eventData: { orderId: '1', userId: 'user1' } }
      ];

      const options = { skipErrorHandling: true };
      await triggerDispatcher.dispatchBatch(events, options);

      expect(orderNotifications.handleEvent).toHaveBeenCalledWith(
        'order.created',
        { orderId: '1', userId: 'user1' },
        options
      );
    });
  });

  describe('isEventSupported()', () => {
    it('should return true for supported order events', () => {
      expect(triggerDispatcher.isEventSupported('order.created')).toBe(true);
      expect(triggerDispatcher.isEventSupported('order.preparing')).toBe(true);
      expect(triggerDispatcher.isEventSupported('order.driver_assigned')).toBe(true);
      expect(triggerDispatcher.isEventSupported('order.in_delivery')).toBe(true);
      expect(triggerDispatcher.isEventSupported('order.delivered')).toBe(true);
      expect(triggerDispatcher.isEventSupported('order.cancelled')).toBe(true);
    });

    it('should return true for supported driver events', () => {
      expect(triggerDispatcher.isEventSupported('driver.order_assigned')).toBe(true);
      expect(triggerDispatcher.isEventSupported('driver.order_ready')).toBe(true);
      expect(triggerDispatcher.isEventSupported('driver.order_cancelled')).toBe(true);
      expect(triggerDispatcher.isEventSupported('driver.order_updated')).toBe(true);
    });

    it('should return true for supported admin events', () => {
      expect(triggerDispatcher.isEventSupported('admin.new_order')).toBe(true);
      expect(triggerDispatcher.isEventSupported('admin.order_cancelled')).toBe(true);
    });

    it('should return false for unsupported events', () => {
      expect(triggerDispatcher.isEventSupported('order.unknown')).toBe(false);
      expect(triggerDispatcher.isEventSupported('driver.unknown')).toBe(false);
      expect(triggerDispatcher.isEventSupported('admin.unknown')).toBe(false);
      expect(triggerDispatcher.isEventSupported('unknown.event')).toBe(false);
    });

    it('should return false for invalid event formats', () => {
      expect(triggerDispatcher.isEventSupported('invalid')).toBe(false);
      expect(triggerDispatcher.isEventSupported('')).toBe(false);
      expect(triggerDispatcher.isEventSupported(null)).toBe(false);
    });
  });

  describe('getSupportedEvents()', () => {
    it('should return all supported events', () => {
      const events = triggerDispatcher.getSupportedEvents();

      expect(events).toHaveProperty('order');
      expect(events).toHaveProperty('driver');
      expect(events).toHaveProperty('admin');

      expect(events.order).toContain('order.created');
      expect(events.order).toContain('order.preparing');
      expect(events.order).toContain('order.driver_assigned');
      expect(events.order).toContain('order.in_delivery');
      expect(events.order).toContain('order.delivered');
      expect(events.order).toContain('order.cancelled');

      expect(events.driver).toContain('driver.order_assigned');
      expect(events.driver).toContain('driver.order_ready');
      expect(events.driver).toContain('driver.order_cancelled');
      expect(events.driver).toContain('driver.order_updated');

      expect(events.admin).toContain('admin.new_order');
      expect(events.admin).toContain('admin.order_cancelled');
    });

    it('should return a copy of SUPPORTED_EVENTS', () => {
      const events = triggerDispatcher.getSupportedEvents();
      events.order.push('order.fake');

      const eventsAgain = triggerDispatcher.getSupportedEvents();
      expect(eventsAgain.order).not.toContain('order.fake');
    });
  });

  describe('SUPPORTED_EVENTS constant', () => {
    it('should export SUPPORTED_EVENTS constant', () => {
      expect(triggerDispatcher.SUPPORTED_EVENTS).toBeDefined();
      expect(triggerDispatcher.SUPPORTED_EVENTS.order).toHaveLength(6);
      expect(triggerDispatcher.SUPPORTED_EVENTS.driver).toHaveLength(4);
      expect(triggerDispatcher.SUPPORTED_EVENTS.admin).toHaveLength(2);
    });
  });
});
