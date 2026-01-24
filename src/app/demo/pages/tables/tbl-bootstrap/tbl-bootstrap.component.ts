import { Component, ChangeDetectionStrategy} from '@angular/core';
import { SharedModule } from 'src/app/theme/shared/shared.module';

@Component({
  selector: 'app-tbl-bootstrap',
  imports: [SharedModule],
  templateUrl: './tbl-bootstrap.component.html',
  styleUrls: ['./tbl-bootstrap.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TblBootstrapComponent {}
