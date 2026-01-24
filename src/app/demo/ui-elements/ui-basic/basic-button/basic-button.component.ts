import { Component, ChangeDetectionStrategy} from '@angular/core';
import { SharedModule } from 'src/app/theme/shared/shared.module';

@Component({
  selector: 'app-basic-button',
  imports: [SharedModule],
  templateUrl: './basic-button.component.html',
  styleUrls: ['./basic-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BasicButtonComponent {}
