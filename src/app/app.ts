import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogHost } from '@shared/components/confirm-dialog/confirm-dialog';
import { ToastHost } from '@shared/components/toast-host/toast-host';
import { TopProgressBar } from '@shared/components/top-progress-bar/top-progress-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmDialogHost, ToastHost, TopProgressBar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('backoffice');
}
