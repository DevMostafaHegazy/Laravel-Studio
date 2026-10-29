import { inject, injectable } from '@theia/core/shared/inversify';
import { Emitter } from '@theia/core/lib/common/event';
import type { Event } from '@theia/core/lib/common/event';
import type { DashboardSection } from './ui-constants';

/**
 * Small shared store so commands and the sidebar can ask an already-open
 * dashboard to switch sections without importing the widget class.
 */
@injectable()
export class LaravelDashboardState {
    protected _section: DashboardSection = 'overview';

    protected readonly onDidChangeEmitter = new Emitter<DashboardSection>();
    readonly onDidChange: Event<DashboardSection> = this.onDidChangeEmitter.event;

    get section(): DashboardSection {
        return this._section;
    }

    setSection(section: DashboardSection): void {
        this._section = section;
        this.onDidChangeEmitter.fire(section);
    }
}
