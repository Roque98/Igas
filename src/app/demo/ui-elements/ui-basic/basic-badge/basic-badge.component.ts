import { Component, ChangeDetectionStrategy} from '@angular/core';
import { SharedModule } from 'src/app/theme/shared/shared.module';

@Component({
  selector: 'app-basic-badge',
  imports: [SharedModule],
  templateUrl: './basic-badge.component.html',
  styleUrls: ['./basic-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BasicBadgeComponent {}
