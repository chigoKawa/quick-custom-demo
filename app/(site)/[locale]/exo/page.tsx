import { Locale } from "@/i18n-config"; // Import locale type for internationalization





type Props = {
    params: Promise<{ locale: Locale; slug: string }>; // Extract locale from the URL params
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>; // Extract preview from the URL search params

    // searchParams: { preview?: string };
};

export default async function IndexPage({ params, searchParams }: Props) {




    return <div className="container mx-auto px-4 py-10">testing</div>
}


