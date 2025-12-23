import { Helmet } from 'react-helmet-async'

interface SEOProps {
    title?: string
    description?: string
    path?: string // relative path, e.g. "/stats"
    image?: string
}

export default function SEO({
    title = "Rubik's Cube Timer & Speedcubing Stats | ao5",
    description = "The best free online Rubik's Cube timer for speedcubing. Features cloud sync, advanced analytics, mobile support, and WCA puzzles. Track your solves and improve your times.",
    path = "",
    image = "https://ao5.app/pwa-512x512.png"
}: SEOProps) {
    const url = `https://ao5.app${path}`

    return (
        <Helmet>
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />

            <meta property="og:url" content={url} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />

            <meta property="twitter:url" content={url} />
            <meta property="twitter:title" content={title} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={image} />
        </Helmet>
    )
}
