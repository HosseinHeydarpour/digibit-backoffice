import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogHost } from '@shared/components/confirm-dialog/confirm-dialog';
import { ToastHost } from '@shared/components/toast-host/toast-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmDialogHost, ToastHost],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('backoffice');
}
