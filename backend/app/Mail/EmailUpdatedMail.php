<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailUpdatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $name;
    public $email;
    public $loginUrl;

    public function __construct($name, $email)
    {
        $this->name = $name;
        $this->email = $email;
        $this->loginUrl = config('app.frontend_url', 'https://miraicrownindonesia.online') . '/login';
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Pemberitahuan Pembaruan Alamat Email Akun',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.email_updated',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
