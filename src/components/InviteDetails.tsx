import heroImg from '../assets/LOGO.png'
import { weddingInfo } from '../weddingInfo'

export function InviteDetails({ isHome = false }: { isHome?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-md text-center">
      <img
        src={heroImg}
        alt=""
        className="mx-auto mb-8 w-50 rounded-full shadow-lg shadow-lilac-200"
      />
      {/* <p className="text-sm tracking-[0.3em] text-lilac-500 uppercase">Casamento</p> */}
      <h1 className="font-sans mt-2 text-5xl font-normal text-[#3f3450]">
        <span className="block">{weddingInfo.partner1Name}</span>
        <span className=" block text-3xl leading-none">e</span>
        <span className="block">{weddingInfo.partner2Name}</span>
      </h1>

      {!isHome && (
        <>
          <p className="mt-4 text-lg text-[#6b5d80]">
            {weddingInfo.dateLabel} às {weddingInfo.time}
          </p>

          <dl className="mt-8 space-y-4 rounded-3xl border border-lilac-200 bg-lilac-100/40 p-6 text-left">
            <div>
              <dt className="text-xs font-semibold tracking-wide text-lilac-500 uppercase">Cerimônia</dt>
              <dd className="text-[#3f3450]">{weddingInfo.ceremonyVenue}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wide text-lilac-500 uppercase">Festa</dt>
              <dd className="text-[#3f3450]">{weddingInfo.receptionVenue}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-wide text-lilac-500 uppercase">Endereço</dt>
              <dd className="text-[#3f3450]">
                <a
                  href={weddingInfo.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-lilac-400 underline-offset-4"
                >
                  {weddingInfo.address}
                </a>
              </dd>
            </div>
            {/* <div>
              <dt className="text-xs font-semibold tracking-wide text-lilac-500 uppercase">Traje</dt>
              <dd className="text-[#3f3450]">{weddingInfo.dressCode}</dd>
            </div> */}
          </dl>
        </>
      )}
    </div>
  )
}
