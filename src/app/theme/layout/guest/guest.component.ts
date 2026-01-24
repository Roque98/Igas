// angular import
import { Component, ChangeDetectionStrategy} from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-guest',
  imports: [RouterModule],
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuestComponent {}
